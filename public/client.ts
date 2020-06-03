import { stringify } from "qs";

const BLOCK_ID_NONE = 0;

const GRID_ID = 'grid';
const SPACE_CLASS = 'space';

const MAX_DIMENSION = 32;
const DEF_DIMENSION = 8;
const MIN_DIMENSION = 4;

interface Block {
	name: string,
	image: string
}

let debugGenerateData = (width:number, height:number, numBlocks:number) => {
	
}

let toHex = (int:number) => {
	let str = int.toString(16);
	if (str.length == 1)
		str = '0' + str;

	return str;
}

let fromHex = (data:string, position:number) => {
	let str = data.substr(position * 2, position * 2 + 2);

	return parseInt(str, 16);
}

class Painting {
	width: number;
	height: number;

	data: number[];

	toData() {
		let data = '';

		data += toHex(this.width);
		data += toHex(this.height);

		this.data.forEach(blockID => {
			data += toHex(blockID);
		});

		return data;
	}

	fromData(data:string) {
		/* do we have enough for a width and height */
		if (data.length < 4) {
			this.setDefault();
			return;
		}

		this.width = fromHex(data, 0);
		this.height = fromHex(data, 1);

		/* is the painting too big or too small? */
		if (
			this.width < MIN_DIMENSION ||
			this.height < MIN_DIMENSION ||
			this.width > MAX_DIMENSION ||
			this.height > MAX_DIMENSION 
		) {
			this.setDefault();
			return;
		}

		/* is the amount of information correct for this width and height */
		if (data.length !== (this.width * this.height + 2) * 2) {
			this.setDefault();
			return;
		}

		for (let i = 0; i < this.width * this.height; ++i) {
			this.data.push(fromHex(data, i + 2));
		}
	}

	/**
	 * creates an empty painting representation at a default width and height
	 * 
	 * guaranteed to work
	 */
	setDefault() {
		this.width = DEF_DIMENSION;
		this.height = DEF_DIMENSION;

		this.data = new Array(DEF_DIMENSION * DEF_DIMENSION).fill(BLOCK_ID_NONE);
	}
}

/* all the blocks the client knows about */
let blockNames:string[];

/* representation of the current painting */
let painting:Painting;

let getGrid = () => {
	console.log(<HTMLDivElement>document.getElementById(GRID_ID));
	return <HTMLDivElement>document.getElementById(GRID_ID);
}

/**
 * clears the dom representation of the grid
 * completely wipes it out, no width or height
 * 
 * @returns the dom representation of the grid
 */
let clearGrid = () => {
	let gridElement = getGrid();

	/* clear dom */
	while(gridElement.firstChild) {
		gridElement.removeChild(gridElement.firstChild);
	}

	return gridElement;
}

/**
 * fills the grid with empty tiles
 * 
 * @param width width of the new grid
 * @param height height of the new grid 
 */
let fillEmptyGrid = (width:number, height:number) => {
	let gridElement = clearGrid();

	gridElement.style.gridTemplateColumns = '50px '.repeat(width);
	gridElement.style.gridTemplateRows = '50px '.repeat(height);

	for (var j = 0; j < height; ++j) {
		for (var i = 0; i < width; ++i) {
			let gridSpace = document.createElement('div');
			gridSpace.className = 'space';
			gridElement.appendChild(gridSpace);
		}
	}

	/* clear representation */
	painting.width = width;
	painting.height = height;
	painting.data = new Array(width * height).fill(BLOCK_ID_NONE);
}

let getBlockURL = (imageName:string) => {
	return '/blocks/' + imageName;
}

let parseData = (url:string) => {
	if (url.startsWith('/blocks/')) {
		let parts = url.split('/blocks/');
		
		let dataPart = parts[1];
	}
}

let onStart = (url:string) => {
	/* get the block data */
	let request = new XMLHttpRequest();
	request.open('GET', '/blockdata');
	request.send();

	request.onreadystatechange = () => {
		blockNames = JSON.parse(request.responseText);
		
		console.log(blockNames);
	}

	fillEmptyGrid(6, 6);
}

/* what happens when we load the page */
onStart(window.location.href);
