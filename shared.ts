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
		return ((this.r << 24) | (this.g << 16) | (this.b << 8) | 0xff) >>> 0;
	}

	toCSS() {
		return 'rgb(' + this.r + ',' + this.g + ',' + this.b + ')';
	}
};

const SKY_COLORS = [
	new Color(20, 215, 250),
	new Color(250, 135, 11),
	new Color(9, 9, 9)
];

const SKY_DAY = 0;
const SKY_SUNSET = 1;
const SKY_NIGHT = 2;

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

	if (code < 45)
		return -1;

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

const PAINTING_HEADER_SIZE = 3;

class Painting {
	width: number;
	height: number;
	sky: number;

	data: number[];

	err: boolean;

	constructor(data?:string | number[], width?:number, sky?:number) {
		if (data) {
			if (Array.isArray(data))
				this.setArray(data, width, sky);
			else
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
		data += toBase66(this.sky);

		this.data.forEach(blockID => {
			data += toBase66(blockID);
		});

		return data;
	}

	setData(data:string) {
		/* do we have enough for a width and height */
		if (data.length < PAINTING_HEADER_SIZE) {
			this.err = true;
			return this.setDefault();
		}

		this.width = fromBase66(data, 0);
		this.height = fromBase66(data, 1);
		this.sky = fromBase66(data, 2);

		/* is the painting too big or too small? */
		if (
			this.width < MIN_DIMENSION ||
			this.height < MIN_DIMENSION ||
			this.width > MAX_DIMENSION ||
			this.height > MAX_DIMENSION 
		) {
			this.err = true;
			return this.setDefault();
		}

		if (this.sky < 0 || this.sky >= SKY_COLORS.length) {
			this.err = true;
			return this.setDefault();
		}

		let goodLength = this.width * this.height + PAINTING_HEADER_SIZE;
		/* is the amount of information correct for this width and height */
		if (data.length !== goodLength) {
			this.err = true;
			return this.setDefault();
		}

		this.data = [];
		for (let i = 0; i < this.width * this.height; ++i)
			this.data.push(fromBase66(data, i + PAINTING_HEADER_SIZE));

		/* if we made it this far we are free of errors */
		this.err = false;
	}

	setArray(array:number[], width:number, sky:number) {
		this.data = array;
		this.err = false;
		this.sky = sky;

		this.width = width;
		this.height = Math.floor(array.length / width);
	}

	/**
	 * creates an empty painting representation at a default width and height
	 * 
	 * guaranteed to work
	 */
	setDefault() {
		this.width = DEF_DIMENSION;
		this.height = DEF_DIMENSION;
		this.sky = SKY_DAY;

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
		return 'Title is too short, must be at least ' + MIN_TITLE_LENGTH + ' characters long';

	if (length > MAX_TITLE_LENGTH) 
		return 'Title is too long, must be at most ' + MAX_TITLE_LENGTH + ' characters long';

	return '';
}

interface GalleryItem {
	data: string,
	title: string
}

let request = (url:string) => {
	return new Promise<string>((accept, reject) => {
		let request = new XMLHttpRequest();
		request.open('GET', url);
	
		request.onreadystatechange = () => {
			if (request.readyState === 4)
				request.status === 200 ? accept(request.responseText) : reject(request.responseText);
		}
	
		request.send();
	});
}

try {
	module.exports = { Color: Color, Painting: Painting, SKY_COLORS: SKY_COLORS, SKY_DAY: SKY_DAY, debugGenerateURL: debugGenerateURL, validateTitle: validateTitle };
} catch (ex) {}
