/// <reference path='shared.ts'/>

const GRID_ID = 'grid';
const SPACE_CLASS = 'space';

const HOTBAR_LENGTH = 6;

/* all the blocks the client knows about */
let blockNames:string[];

/* representation of the current painting */
let painting:Painting;

let hotbar:Hotbar;

let viewButton:HTMLButtonElement;

interface Block {
	name: string,
	image: string
}

class Hotbar {
	blocks:number[];
	selected:number;

	div: HTMLDivElement;

	constructor(length:number) {
		this.blocks = new Array(length);
		this.selected = 0;

		this.div = <HTMLDivElement>document.getElementById('hotbar');
		this.div.style.gridTemplateRows = '80px '.repeat(length);

		for (let i = 0; i < length; ++i) {
			let holder = document.createElement('div');
			this.div.appendChild(holder);

			let image = document.createElement('img');
			holder.appendChild(image);

			let blockIndex = i + 1;

			/* fill in the blocks in the hotbar */
			/* if not enough block data fill air */
			if (blockIndex < blockNames.length) {
				this.setSlot(i, blockIndex);
			} else {
				this.setSlot(i, 0);
			}

			let index = i;

			/* selecting this slot */
			holder.onmousedown = (event) => {
				if (event.button === 0) {
					this.select(index);
				}
			}
		}

		window.onkeydown = (event:KeyboardEvent) => {
			let code = event.keyCode;

			console.log(code);

			/* number keys */
			if (code >= 49 && code <= 57) {
				let keySelection = code - 49;

				if (keySelection < this.blocks.length)
					this.select(keySelection);
			}
		}

		/* select first slot */
		this.select(0);
	}

	private select(index:number) {
		let children = this.div.children;

		children[this.selected].classList.remove('selected');

		this.selected = index;
		children[this.selected].classList.add('selected');
	}

	private setSlot(index:number, block:number) {
		this.blocks[index] = block;
		let img = <HTMLImageElement>this.div.children[index].firstChild;

		img.src = getBlockURL(block);
	}

	addBlock(block: number) {
		let indexInHotbar = this.blocks.indexOf(block);

		/* replace the selected block with the new block */
		if (indexInHotbar === -1) {
			this.setSlot(this.selected, block);

		/* if we already have the block in our hotbar go to it */
		} else {
			this.select(indexInHotbar);
		}
	}

	getBlock() {
		return this.blocks[this.selected];
	}
}

let setupButtons = () => {
	viewButton = <HTMLButtonElement>document.getElementById('viewButton');

	viewButton.onclick = () => getImage(painting);
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
		gridImg.src = getBlockURL(painting.data[i]);
	}
}

/* bitwise detecting which mouse buttons are being pressed */

let leftDown = (buttons:number) => {
	return (buttons & 0b01) === 0b01;
}

let rightDown = (buttons:number) => {
	return (buttons & 0b10) === 0b10;
}

let middleDown = (buttons:number) => {
	return (buttons & 0b100) === 0b100;
}

let onClickSpace = (index:number, gridImg:HTMLImageElement, buttons:number) => {
	let left = leftDown(buttons);
	let right = rightDown(buttons);
	let middle = middleDown(buttons);

	if (left || right) {
		/* create air if right click */
		let insertion = left ? hotbar.getBlock() : BLOCK_ID_AIR;

		/* update in painting representation */
		painting.data[index] = insertion;
	
		/* update in dom */
		gridImg.src = getBlockURL(insertion);
	
		/* update in hash */
		let hash = document.location.hash.substr(1);
		document.location.hash = hash.slice(0, 2 + index) + toBase66(insertion) + hash.slice(3 + index);

	/* just selecting block */
	} else if (middle) {
		let block = painting.data[index];

		if (block != BLOCK_ID_AIR)
			hotbar.addBlock(block);
	}
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

		let gridLines = document.createElement('div');
		gridLines.className = 'gridlines';
		gridSpace.appendChild(gridLines);

		let index = i;

		gridSpace.onmousedown = (event:MouseEvent) => {
			onClickSpace(index, gridImg, event.buttons);
		}

		gridSpace.onmouseover = (event:MouseEvent) => {
			onClickSpace(index, gridImg, event.buttons);
		}
	}

	gridElement.addEventListener('contextmenu', event => { 
		// do something here... 
		event.preventDefault();
	}, false);
}

let getImage = (painting: Painting) => {
	window.open('/image/' + painting.toData(), '_blank');
}

let getBlockURL = (blockIndex:number) => {
	return '/blocks/' + blockNames[blockIndex];
}

let parseData = (hash:string) => {
	if (hash !== '') {
		let data = hash.substr(1);
	
		return new Painting(data);
	}

	return new Painting();
}

let onStartEdit = (hash:string) => {
	/* get the block data */
	let request = new XMLHttpRequest();
	request.open('GET', '/blockdata');
	request.send();

	/* set sky color */
	document.documentElement.style.setProperty('--sky', SKY_COLOR.toCSS());

	/* create the painting from the url */
	painting = parseData(hash);

	request.onreadystatechange = () => {
		if (request.readyState === 4) {
			blockNames = JSON.parse(request.responseText);

			hotbar = new Hotbar(HOTBAR_LENGTH);

			setupButtons();

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

onStartEdit(document.location.hash);
