/// <reference path='shared.ts'/>

import * as express from 'express';
import * as handlebars from 'express-handlebars';
import * as fs from 'fs';
import * as jimp from 'jimp';
import { Jimp } from '@jimp/core/types/jimp';
import { createInterface } from 'readline';

let shared = require('./shared');

const port = process.env.PORT || 3000;
let server = express();

let blockNames:Array<string> = [];
let blockURLs:Array<string> = [];
let foregroundImages:Array<Jimp> = [];
let backgroundImages:Array<Jimp> = [];

let missingBuffer:Buffer;

let gallery:GalleryItem[];

let activeButtons = (gallery:boolean, edit:boolean) => {
	const CURRENT_TAG = 'current';

	return {
		galleryActive: gallery ? CURRENT_TAG : '',
		editActive: edit ? CURRENT_TAG : ''
	};
}

let getEdit = (req, res, next) => {
	res.render('partials/edit.handlebars', activeButtons(false, true));
}

let loadBlockData = () => {
	return new Promise((accept, reject) => {
		fs.readFile('data/blocks.json', (err, data) => {
			if (err) {
				reject();
				return;
			}

			let array = JSON.parse(data.toString());
	
			/* deafault buffer */
			jimp.read('missing.png').then(image => {
				image.getBufferAsync(jimp.MIME_PNG).then(buffer => missingBuffer = buffer);
			}).catch(reject);
	
			/* load air block */
			blockNames.push('air');
			blockURLs.push('air.png');

			/* separate the block data into names and images */
			array.forEach(block => {
				blockNames.push(block.name);
				blockURLs.push(block.image);
			});

			/* make jimp images for all the blocks */
			/* and all background blocks */
			let imagesCreated = 0;
			let maxImages = blockURLs.length;

			foregroundImages = new Array(maxImages);
			backgroundImages = new Array(maxImages);

			for (let i = 0; i < maxImages; ++i) {
				let index = i;

				let blockURL = 'blocks/' + blockURLs[index];

				jimp.read(blockURL).then(image => {
					foregroundImages[index] = image;
					backgroundImages[index] = image.clone().brightness(-0.5);

					++imagesCreated;

					if (imagesCreated === maxImages)
						accept();
				}).catch(() => {
					console.log('failed to read: ' + blockURL);
					reject();
				});
			}
		});
	});
}

let loadGalleryData = () => {
	return new Promise((accept, reject) => {
		const path = 'data/gallery.json';

		if (fs.existsSync(path)) {
			fs.readFile(path, (err, data) => {
				if (err)
					reject();
				else {
					/* catch bad json */
					try {
						gallery = JSON.parse(data.toString());
					} catch (ex) {
						gallery = [];
					}

					if (!Array.isArray(gallery))
						gallery = [];

					accept();
				}
			});

		/* create the gallery json if it doesn't exist */
		} else {
			gallery = [];
			fs.writeFile(path, '[]', err => err ? reject() : accept());
		}
	});
}

let saveGalleryData = () => {
	console.log('saving gallery data...');

	const path = 'data/gallery.json';

	let data = JSON.stringify(gallery);

	fs.writeFileSync(path, data);
}

server.use(express.static('public'));
server.engine('handlebars', handlebars({defaultLayout: 'mine'}));
server.set('view engine', 'handlebars');

server.get('/', (req, res, next) => {
	getEdit(req, res, next);
});

server.get('/edit', (req, res, next) => {
	getEdit(req, res, next);
});

server.get('/edit/:data', (req, res, next) => {
	getEdit(req, res, next);
});

server.get('/blocks/:block', (req, res, next) => {
	let blockName = req.params['block'];

	let blockIndex = blockNames.indexOf(blockName);

	/* fallback to debug block for incorrect block */
	if (blockIndex === -1) {
		res.sendFile(__dirname + '/blocks/default.png');
	} else {
		res.sendFile(__dirname + '/blocks/' + blockURLs[blockIndex]);
	}
});

/**
 * the client requests a list of the names for all blocks
 * 
 * this value is internally cached as an array
 */
server.get('/blockdata', (req, res, next) => {
	res.json(blockNames);
});

server.get('/image/:data', (req, res, next) => {
	let data = req.params['data'];

	let painting = new shared.Painting(data);

	res.setHeader('Content-disposition', 'attachment;filename=painting.png');
	res.setHeader('Content-Type', 'image/png');

	createPaintingImage(painting).then(buffer => {
		res.send(buffer);

	}).catch(() => {
		res.send(missingBuffer);
	});
});

/* gallery stuff */

server.get('/gallery', (req, res, next) => {
	res.render('partials/gallery', activeButtons(true, false));
});

server.get('/galleryList', (req, res, next) => {
	res.send(gallery);
});

server.get('/galleryItem/:id', (req, res, next) => {
	let fail = () => res.status(400).send('incorrect data');

	let id = +req.params['id'];

	if (isNaN(id))
		fail();
	else
		if (id < 0 || id >= gallery.length)
			fail();
		else
			res.send(gallery[id]);
});

server.get('/deleteGalleryItem/:data', (req, res, next) => {
	let data = req.params['data'];

	let index = -1;

	/* search for the data in our gallery list */
	let found = gallery.every((item, i) => {
		if (item.data === data) {
			index = i;
			return false;
		}

		return true;
	});

	if (index === -1) {
		res.status(400).send('could not delete');

	} else {
		gallery.splice(index, 1);
		res.send('success');
	}
});

server.get('/uploadGallery/:data/:title', (req, res, next) => {
	let data = req.params['data'];
	let title = req.params['title'];

	/* validate title */
	let titleResponse = shared.validateTitle(title);
	if (titleResponse === '') {
		/* validate data */
		let painting = new shared.Painting(data);

		if (painting.getError()) {
			res.status(400).send('invalid painting data');
	
		} else {
			gallery.push({data:data, title:title});
			res.send('success');
		}
	} else {
		res.status(400).send(titleResponse);
	}		
});

server.get('*', (req, res, next) => {
	console.log('URL:' + req.url);

	res.render('partials/404', activeButtons(false, false));
});

/* startup */
let cannotStart = () => console.log('server could not start due to an error');

loadBlockData().then(() => {
	loadGalleryData().then(() => {
		server.listen(port, () => {
			console.log('server running on port ' + port + '!');
		});

		process.on('exit', () => {
			saveGalleryData();
		});

		process.on('SIGINT', () => {
			saveGalleryData();
			process.exit();
		});

		let input = createInterface(process.stdin, process.stdout);

		input.on('line', line => {
			if (line === 'q')
				process.exit();
		});
	}).catch(cannotStart);
}).catch(cannotStart);

/* image stuff */

/**
 * @param painting painting to make an image of
 * 
 * @returns a promise that on accepted gives you a buffer of the created image
 */
let createPaintingImage = (painting:Painting) => {
	return new Promise((accept, reject) => {
		jimp.create(16 * painting.width, 16 * painting.height, shared.SKY_COLORS[painting.sky].toHex()).then(image => {
			for (let j = 0; j < painting.height; ++j) {
				for (let i = 0; i < painting.width; ++i) {
					let dataIndex = j * painting.width + i;

					let background = painting.background[dataIndex];
					let foreground = painting.foreground[dataIndex];
					
					image.blit(backgroundImages[background], i * 16, j * 16).blit(foregroundImages[foreground], i * 16, j * 16);
				}
			}

			image.getBufferAsync(jimp.MIME_PNG).then(buffer => {
				accept(buffer);
			}).catch(reject);

		}).catch(reject);
	});
}
