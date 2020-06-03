
import * as express from 'express';
import * as handlebars from 'express-handlebars';
import * as fs from 'fs';

const port = process.env.PORT || 3000;
let server = express();

let blockNames:Array<string> = [];
let blockImages:Array<string> = [];

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

let loadBlockData = (callback:() => void) => {
	fs.readFile('data/blocks.json', (err, data) => {
		let array = JSON.parse(data.toString());

		/* separate the block data into names and images */
		array.forEach(block => {
			blockNames.push(block.name);
			blockImages.push(block.image);
		});

		console.log('block data loaded for ' + blockNames.length + ' blocks!');

		callback();
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
	let data = req.params['data'];

	getEdit(req, res, next);
});

server.get('/blocks/:block', (req, res, next) => {
	let blockName = req.params['block'];

	let blockIndex = blockNames.indexOf(blockName);

	/* fallback to debug block for incorrect block */
	if (blockIndex === -1) {
		res.sendFile(__dirname + '/blocks/default.png');
	} else {
		res.sendFile(__dirname + '/blocks/' + blockImages[blockIndex]);
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

server.get('*', (req, res, next) => {
	res.render('partials/404', activeButtons(false, false));
});

/* startup */
loadBlockData(() => {
	server.listen(port, () => {
		console.log('server running on port ' + port + '!');
	});
});