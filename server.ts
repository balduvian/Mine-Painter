
import * as express from 'express';
import * as handlebars from 'express-handlebars';
import * as fs from 'fs';

const port = process.env.PORT || 3000;
let server = express();

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
	let blockPath = req.url;

	fs.exists(blockPath, (exists) => {
		if (exists)
			res.sendFile(blockPath);
		else
			res.sendFile(__dirname + '/blocks/default.png');
	});
});

server.get('/blockdata', (req, res, next) => {
	res.sendFile(__dirname + '/data/blocks.json')
});

server.get('*', (req, res, next) => {
	res.render('partials/404', activeButtons(false, false));
});

server.listen(port, () => {
	console.log('server running on port ' + port);
});
