
class Color {
	r: number;
	g: number;
	b: number;

	constructor(r:number, g:number, b:number) {
		this.r = r;
		this.g = g;
		this.b = b;
	}

	toHex() {
		return (this.r << 24) | (this.g << 16) | (this.b << 8) | 0xff;
	}

	toCSS() {
		return '#' + this.toHex().toString(16);
	}
};

const SKY_COLOR = new Color(20, 215, 250);

const BASE_66 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._~';

const BLOCK_ID_AIR = 0;

const MAX_DIMENSION = 32;
const DEF_DIMENSION = 8;
const MIN_DIMENSION = 4;

const MIN_TITLE_LENGTH = 2;
const MAX_TITLE_LENGTH = 32;

let toBase66 = (int:number) => {
	return BASE_66.charAt(int);
}

let fromBase66 = (data:string, position:number) => {
	let code = data.charCodeAt(position);
	return parseBase66(code);
}

let parseBase66 = (code:number) => {
	/* magic ascii values */
	/* too bad js doesn't have char literals */

	/* -. */
	if (code < 47) 
		return code - 42 + 62;

	/* numbers */
	if (code < 58)
		return code - 48;

	/* upper case letters */
	if (code < 91)
		return code - 65 + 36;

	/* _ */
	if (code === 95)
		return 64;

	/* lower case letters */
	if (code < 123)
		return code - 97 + 10;

	/* ~ */
	if (code === 126)
		return 65;

	/* if it's an invalid base66 character */
	return -1;
}

let debugGenerateURL = (width:number, height:number, numBlocks:number) => {
	let data = toBase66(width) + toBase66(height);

	for (let i = 0; i < width * height; ++i) {
		data += toBase66((Math.random() * numBlocks));
	}

	return data;
}

class Painting {
	width: number;
	height: number;

	data: number[];

	err: boolean;

	constructor(data?:string) {
		if (data) {
			this.setData(data);

		} else {
			this.err = false;
			this.setDefault();
		}
	}

	toData() {
		let data = '';

		data += toBase66(this.width);
		data += toBase66(this.height);

		this.data.forEach(blockID => {
			data += toBase66(blockID);
		});

		return data;
	}

	setData(data:string) {
		/* do we have enough for a width and height */
		if (data.length < 4) {
			console.log('data is too short, must be at least 4 long for width and height!');

			this.err = true;
			return this.setDefault();
		}

		this.width = fromBase66(data, 0);
		this.height = fromBase66(data, 1);

		/* is the painting too big or too small? */
		if (
			this.width < MIN_DIMENSION ||
			this.height < MIN_DIMENSION ||
			this.width > MAX_DIMENSION ||
			this.height > MAX_DIMENSION 
		) {
			console.log('painting dimensions are not within range, must be at least ' + MIN_DIMENSION + ' and at most ' + MAX_DIMENSION + '!');

			this.err = true;
			return this.setDefault();
		}

		let goodLength = this.width * this.height + 2;
		/* is the amount of information correct for this width and height */
		if (data.length !== goodLength) {
			console.log('painting has an incorrect amount of data. should be ' + goodLength + ', had ' + data.length + '!');

			this.err = true;
			return this.setDefault();
		}

		this.data = [];
		for (let i = 0; i < this.width * this.height; ++i) {
			this.data.push(fromBase66(data, i + 2));
		}

		/* if we made it this far we are free of errors */
		this.err = false;
	}

	/**
	 * creates an empty painting representation at a default width and height
	 * 
	 * guaranteed to work
	 */
	setDefault() {
		this.width = DEF_DIMENSION;
		this.height = DEF_DIMENSION;

		this.data = new Array(DEF_DIMENSION * DEF_DIMENSION).fill(BLOCK_ID_AIR);
	}

	/**
	 * checks if the creation of this painting
	 * resulted in an error
	 * 
	 * sets the error state back to false
	 */
	getError() {
		if (this.err) {
			this.err = false;
			return true;

		} else {
			return false;
		}
	}
};

/**
 * checks if a user submitted title is proper
 * 
 * @param title the title to validate
 * 
 * @returns an error message or '' (empty string) if the title is acceptible
 */
let validateTitle = (title:string) => {
	let length = title.length;

	if (length < MIN_TITLE_LENGTH)
		return 'title is too short, must be at least ' + MIN_TITLE_LENGTH + ' characters long';

	if (length > MAX_TITLE_LENGTH) 
		return 'title is too long, must be at most ' + MAX_TITLE_LENGTH + ' characters long';

	for (let i = 0; i < length; ++i) {
		let code = title.charCodeAt(i);

		/* only valid base66 characters allowed */
		if (parseBase66(code) === -1)
			return 'title contains illegal character at position ' + i + ', (' + title.charAt(i) + ')';
	}

	return '';
}

interface GalleryItem {
	data: string,
	title: string
}

/* set sky color */
try {
	document.documentElement.style.setProperty('--sky', SKY_COLOR.toCSS());
} catch (ex) {}

try {
	module.exports = { Color: Color, Painting: Painting, SKY_COLOR: SKY_COLOR, debugGenerateURL: debugGenerateURL };
} catch (ex) {}
