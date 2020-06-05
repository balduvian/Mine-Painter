/// <reference path='shared.ts'/>

import * as express from 'express';
import * as handlebars from 'express-handlebars';
import * as fs from 'fs';
import * as jimp from 'jimp';
import { Jimp } from '@jimp/core/types/jimp';

let shared = require('./shared');

const port = process.env.PORT || 3000;
let server = express();

let blockNames:Array<string> = [];
let blockURLs:Array<string> = [];
let blockImages:Array<Jimp> = [];

let missingBuffer:Buffer;

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
			let imagesCreated = 0;
			let maxImages = blockURLs.length;
			blockImages = new Array(maxImages);

			for (let i = 0; i < maxImages; ++i) {
				let index = i;

				jimp.read('blocks/' + blockURLs[index]).then(image => {
					blockImages[index] = image;

					++imagesCreated;

					if (imagesCreated === maxImages)
						accept();
				}).catch(reject);
			}
		});
	});
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

server.get('*', (req, res, next) => {
	console.log('URL:' + req.url);

	res.render('partials/404', activeButtons(false, false));
});

/* startup */
loadBlockData().then(() => {
	server.listen(port, () => {
		console.log('server running on port ' + port + '!');
	});
}).catch(() => {
	console.log('server could not start due to an error');
});

/* image stuff */

/**
 * @param painting painting to make an image of
 * 
 * @returns a promise that on accepted gives you a buffer of the created image
 */
let createPaintingImage = (painting:Painting) => {
	return new Promise((accept, reject) => {
		let completed = 0;
		let max = painting.width * painting.height;

		jimp.create(16 * painting.width, 16 * painting.height, shared.SKY_COLOR.toHex()).then(image => {
			for (let j = 0; j < painting.height; ++j) {
				for (let i = 0; i < painting.width; ++i) {
					let dataIndex = j * painting.width + i;
					let blockIndex = painting.data[dataIndex];
					let blockImage = blockImages[blockIndex];
					
					image.blit(blockImage, i * 16, j * 16, (err, blitImage) => {
						++completed;

						if (completed === max)
							blitImage.getBufferAsync(jimp.MIME_PNG).then(buffer => {
								accept(buffer);

							}).catch(reject);
					});
				}
			}
		}).catch(reject);
	});
}
