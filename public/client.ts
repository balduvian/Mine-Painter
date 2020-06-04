const BLOCK_ID_NONE = 0;

const GRID_ID = 'grid';
const SPACE_CLASS = 'space';

const MAX_DIMENSION = 32;
const DEF_DIMENSION = 8;
const MIN_DIMENSION = 4;

/* all the blocks the client knows about */
let blockNames:string[];

/* representation of the current painting */
let painting:Painting;

let mouseDown: boolean;

interface Block {
	name: string,
	image: string
}

let debugGenerateData = (width:number, height:number, numBlocks:number) => {
	let data = toHex(width) + toHex(height);

	for (let i = 0; i < numBlocks; ++i) {
		data += toHex((Math.random() * numBlocks));
	}

	return data;
}

let toHex = (int:number) => {
	let str = int.toString(16);
	if (str.length == 1)
		str = '0' + str;

	return str;
}

let fromHex = (data:string, position:number) => {
	let str = data.substr(position * 2, 2);

	return parseInt(str, 16);
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

		data += toHex(this.width);
		data += toHex(this.height);

		this.data.forEach(blockID => {
			data += toHex(blockID);
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

		this.width = fromHex(data, 0);
		this.height = fromHex(data, 1);

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

		let goodLength = (this.width * this.height + 2) * 2;
		/* is the amount of information correct for this width and height */
		if (data.length !== goodLength) {
			console.log('painting has an incorrect amount of data. should be ' + goodLength + ', had ' + data.length + '!');

			this.err = true;
			return this.setDefault();
		}

		this.data = [];
		for (let i = 0; i < this.width * this.height; ++i) {
			this.data.push(fromHex(data, i + 2));
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

		this.data = new Array(DEF_DIMENSION * DEF_DIMENSION).fill(BLOCK_ID_NONE);
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
}

let getGrid = () => {
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

let setHash = (painting:Painting) => {
	document.location.hash = painting.toData();
}

let hashUpdate = (hash) => {
	let oldPainting = painting;
	let err:Error = undefined;
	painting = parseData(hash);

	console.log(err);
	console.log(!err);

	if (!painting.getError() && oldPainting.width === painting.width && oldPainting.height === painting.height) {
		/* we can just replace the blocks if width and height is the same */
		updateGrid(painting);
		
	} else {
		/* nope we have to redo everything */
		createGrid(painting);
		setHash(painting);
	}
}

let updateGrid = (painting:Painting) => {
	let gridElement = getGrid();
	let childList = gridElement.children;

	for (var i = 0; i < painting.width * painting.height; ++i) {
		let gridImg = <HTMLImageElement>childList[i].firstChild;
		gridImg.src = getBlockURL(blockNames[painting.data[i]]);
	}
}

let inputHandler = () => {
	window.onmousedown = () => mouseDown = true;
	window.onmouseup = () => mouseDown = false;
}

let onClickSpace = (index:number, gridImg:HTMLImageElement) => {
	//TODO make this tied to some variable
	let insertion = 4;

	/* update in painting representation */
	painting.data[index] = insertion;

	/* update in dom */
	gridImg.src = getBlockURL(blockNames[insertion]);

	/* update in hash */
	let hash = document.location.hash.substr(1);
	document.location.hash = hash.slice(0, 4 + index * 2) + toHex(insertion) + hash.slice(4 + ((index + 1) * 2));
}

let createGrid = (painting:Painting) => {
	let gridElement = clearGrid();

	gridElement.style.gridTemplateColumns = '1fr '.repeat(painting.width);
	gridElement.style.gridTemplateRows = '1fr '.repeat(painting.height);

	for (var i = 0; i < painting.width * painting.height; ++i) {
		let gridSpace = document.createElement('div');
		gridSpace.className = 'space';
		gridElement.appendChild(gridSpace);
		
		let gridImg = document.createElement('img');
		gridImg.src = '/blocks/' + blockNames[painting.data[i]];
		gridSpace.appendChild(gridImg);

		let indexNum = i;

		gridSpace.onmousedown = (event) => {
			if (event.button === 0)
				onClickSpace(indexNum, gridImg);
		}

		gridSpace.onmousemove = (event) => {
			if (mouseDown && event.button === 0)
				onClickSpace(indexNum, gridImg);
		}
	}
}

let getBlockURL = (imageName:string) => {
	return '/blocks/' + imageName;
}

let parseData = (hash:string) => {
	if (hash !== '') {
		let data = hash.substr(1);
	
		return new Painting(data);
	}

	return new Painting();
}

let onStart = (hash:string) => {
	/* get the block data */
	let request = new XMLHttpRequest();
	request.open('GET', '/blockdata');
	request.send();

	inputHandler();

	/* create the painting from the url */
	painting = parseData(hash);

	request.onreadystatechange = () => {
		if (request.readyState === 4) {
			console.log('RESPONSE:' + request.responseText);

			blockNames = JSON.parse(request.responseText);

			/* wait for blocks to load to start creating the painting in the DOM */
			createGrid(painting);
			setHash(painting);

			/* when you manually update the url it is reflected in the document */
			//window.onhashchange = (ev) => {
			//	console.log(ev.orginalEvent)
			//	
			//	if (ev !== undefined)
			//		hashUpdate(document.location.hash);
			//};
		}
	}
}

onStart(document.location.hash);
