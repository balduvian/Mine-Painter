/// <reference path='shared.ts'/>

var Handlebars;

const GRID_ID = 'grid';
const SPACE_CLASS = 'space';

const HOTBAR_LENGTH = 6;

/* all the blocks the client knows about */
let blockNames:string[];

/* representation of the current painting */
let painting:Painting;

let hotbar:Hotbar;

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
	let viewButton = document.getElementById('viewButton') as HTMLButtonElement;
	viewButton.onclick = () => getImage(painting);

	let resizeButton = document.getElementById('resizeButton') as HTMLButtonElement;
	resizeButton.onclick = () => openOverlay(createResize);

	let inventoryButton = getInventoryButton();
	inventoryButton.onclick = openInventory;

	let backButton = document.getElementById('backButton') as HTMLButtonElement;
	backButton.onclick = closeInventory;
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

	gridElement.style.setProperty('--paintingWidth', painting.width+'');
	gridElement.style.setProperty('--paintingHeight', painting.height+'');

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

let getInventory = () => {
	return document.getElementById('inventory') as HTMLDivElement;
}

let getInventoryButton = () => {
	return document.getElementById('inventoryButton') as HTMLButtonElement;
}

let fillInventory = (blockNames:string[]) => {
	let holder = document.getElementById('holder') as HTMLDivElement;

	let numBlocks = blockNames.length;

	for (let i = 1; i < numBlocks; ++i) {
		let blockImg = document.createElement('img');
		blockImg.src = getBlockURL(i);

		let index = i;

		blockImg.onclick = () => {
			hotbar.addBlock(index);
		}

		holder.appendChild(blockImg);
	}
}

let openInventory = () => {
	let inventory = getInventory();
	let button = getInventoryButton();

	inventory.classList.add('active');
	button.classList.remove('active');
}

let closeInventory = () => {
	let inventory = getInventory();
	let button = getInventoryButton();

	inventory.classList.remove('active');
	button.classList.add('active');
}

let getOverlay = () => {
	return <HTMLDivElement>document.getElementById('overlay');
}

let resize = (newWidth:number, newHeight:number, oldPainting:Painting, offsetX:number, offsetY:number) => {
	/* fill a new sheet with air */
	let newSheet = new Array(newWidth * newHeight).fill(BLOCK_ID_AIR);

	let oldWidth = oldPainting.width;
	let oldHeight = oldPainting.height;
	let oldSheet = oldPainting.data;

	/* copy transformed data into new sheet */
	for (let i = 0; i < oldWidth; ++i) {
		for (let j = 0; j < oldHeight; ++j) {
			let oldPosition = j * oldWidth + i;
			let newPosition = (j + offsetY) * newWidth + (i + offsetX);

			newSheet[newPosition] = oldSheet[oldPosition];
		}
	}

	painting = new Painting(newSheet, newWidth);
	createGrid(painting);
	setHash(painting);
}

let createResize = (parent:HTMLDivElement) => {
	let dialogHTML = <string>Handlebars.templates.resizeDialog({
		oldWidth: painting.width,
		oldHeight: painting.height
	});
	parent.insertAdjacentHTML('beforeend', dialogHTML);

	/* edit functionality */

	let dialog = document.getElementById('dialogBack');

	let arrows = Array.from((dialog.getElementsByClassName('arrowGrid')[0] as HTMLDivElement).children) as HTMLButtonElement[];
	arrows.forEach(button => {
		let thisButton = button;

		button.onclick = (event) => {
			/* remove active from the rest */
			arrows.forEach(loopButton => {
				loopButton.classList.remove('active');
			});

			/* put active on this */
			thisButton.classList.add('active');
		}
	})

	let inputs = Array.from(dialog.getElementsByClassName('dimensionInput') as HTMLCollectionOf<HTMLInputElement>);
	inputs.forEach(input => {
		if (input.classList.contains('fakeInput')) {
			input.disabled = true;

		} else {
			input.maxLength = 2;
			input.min = MIN_DIMENSION + '';
			input.max = MAX_DIMENSION + '';
			input.type = 'number';

			input.onblur = event => {
				let value = +(event.target as HTMLInputElement).value;
				if (value < MIN_DIMENSION)
					input.value = MIN_DIMENSION + '';
				else if (value > MAX_DIMENSION)
					input.value = MAX_DIMENSION + '';
			}
		}
	});

	let ok = document.getElementById('okButton') as HTMLButtonElement;
	ok.onclick = () => {
		/* validate input */
		let widthInput = document.getElementById('widthInput') as HTMLInputElement;
		let heightInput = document.getElementById('heightInput') as HTMLInputElement;

		let width = +widthInput.value;
		let height = +heightInput.value;

		let err = '';
		const tooSmall = ' is too small. Should be at least ' + MIN_DIMENSION;
		const tooLarge = ' is too large. Should be at least ' + MIN_DIMENSION;

		if (isNaN(width) || width === 0)
			err = 'Please enter a value for width';
		else if (isNaN(height) || height === 0)
			err = 'Please enter a value for height';
		else if (width < MIN_DIMENSION)
			err = 'width' + tooSmall;
		else if (width > MAX_DIMENSION)
			err = 'width' + tooLarge;
		else if (height < MIN_DIMENSION)
			err = 'height' + tooSmall;
		else if (height > MAX_DIMENSION)
			err = 'height' + tooLarge;

		if (err === '') {
			/* find out how much offset we need to move the painting by */
			let fullW = width - painting.height;
			let halfW = Math.floor(fullW / 2);
			let fullH = height - painting.height;
			let halfH = Math.floor(fullH / 2);

			let xLookup = [
				0, halfW, fullW,
				0, halfW, fullW,
				0, halfW, fullW,
			];

			let yLookup = [
				0, 0, 0,
				halfH, halfH, halfH,
				fullH, fullH, fullH,
			]

			/* find the index of the button that we pressed */
			let activeButton = 0;
			arrows.every((button, index) => {
				if (button.classList.contains('active')) {
					activeButton = index;
					return false;
				}

				return true;
			});

			resize(width, height, painting, xLookup[activeButton], yLookup[activeButton]);
			closeOverlay();
		} else {
			alert(err);
		}
	}

	let cancel = document.getElementById('cancelButton') as HTMLButtonElement;
	cancel.onclick = closeOverlay;
}

let openOverlay = (createDialog:(parent:HTMLDivElement) => void) => {
	let overlay = getOverlay();

	/* add the dialog box to the overlay */
	createDialog(overlay);

	overlay.classList.add('active');
}

let closeOverlay = () => {
	let overlay = getOverlay();

	/* remove the dialog box that was created on the overlay */
	while (overlay.firstChild)
		overlay.firstChild.remove();

	/* hide the overlay */
	overlay.classList.remove('active');
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

	/* create the painting from the url */
	painting = parseData(hash);

	request.onreadystatechange = () => {
		if (request.readyState === 4) {
			blockNames = JSON.parse(request.responseText);

			hotbar = new Hotbar(HOTBAR_LENGTH);
			fillInventory(blockNames);

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