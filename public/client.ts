
const BLOCK_ID_NONE = 0;

const DOCUMENT_ID = 'grid';
const SPACE_CLASS = 'space';

interface Block {
	name: string,
	image: string
}

/* all the blocks the client knows about */
let blockData:Array<Block>;

/* representation of the grid */
let grid:Array<number>;

let getGrid = () => {
	return <HTMLDivElement>document.getElementById(DOCUMENT_ID);
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

	for (var j = 0; j < height; ++j) {
		for (var i = 0; i < width; ++i) {

		}
	}

	/* clear representation */
	grid = new Array(width * height).fill(BLOCK_ID_NONE);
}

let getBlockURL = (imageName:string) => {
	return '/blocks/' + imageName;
}

let parseData = (url:string) => {
	//TODO parse data from url
}

let onStart = (url:string) => {
	/* get the block data */
	let request = new XMLHttpRequest();
	request.open('GET', '/blockdata');
	request.send();

	request.onreadystatechange = () => {
		blockData = JSON.parse(request.responseText);
		
		console.log(blockData);
	}
}

/* what happens when we load the page */
onStart(window.location.href);
