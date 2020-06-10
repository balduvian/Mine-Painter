/// <reference path='shared.ts'/>

var Handlebars;

const GRID_ID = 'grid';
const SPACE_CLASS = 'space';

const HOTBAR_LENGTH = 7;

/* all the blocks the client knows about */
let blockNames:string[];

/* representation of the current painting */
let painting:Painting;

let hotbar:Hotbar;

let showingGrid:boolean;
let activeLayer:boolean;

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

		/* select first slot */
		this.select(0);
	}

	onKey(code:number) {
		if (code >= 49 && code <= 57) {
			let keySelection = code - 49;

			if (keySelection < this.blocks.length) {
				hotbar.select(keySelection);
				return true;
			}
		}

		return false;
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

	let saveButton = document.getElementById('saveButton') as HTMLButtonElement;
	saveButton.onclick = () => openOverlay(createSave);

	let inventoryButton = getInventoryButton();
	inventoryButton.onclick = openInventory;

	let backButton = document.getElementById('backButton') as HTMLButtonElement;
	backButton.onclick = closeInventory;

	let skyButton = document.getElementById('skyButton') as HTMLButtonElement;
	skyButton.onclick = cycleSky;

	let gridButton = document.getElementById('gridButton') as HTMLButtonElement;
	gridButton.onclick = toggleGrid;

	let layerButton = document.getElementById('layerButton') as HTMLButtonElement;
	layerButton.onclick = toggleLayer;

	/* setup key shortcuts */

	window.onkeydown = (event:KeyboardEvent) => {
		let code = event.keyCode;

		if (!hotbar.onKey(code)) {
			switch (code) {
				case 71: {
					/* keycode for g */
					toggleGrid();
				} break;
				case 68: {
					/* keycode for d */
					cycleSky();
				} break;
				case 76: {
					/* keycode for l */
					toggleLayer();
				}
			}
		}
	}
}

let toggleLayer = () => {
	activeLayer = !activeLayer;

	setLayer(activeLayer);
}

let setLayer = (layer:boolean) => {
	activeLayer = layer;

	/* set icon of layer button */
	let layerButton = document.getElementById('layerButton') as HTMLButtonElement;
	(layerButton.firstChild as HTMLImageElement).src = layer ? '/svg/icon_front.svg' : '/svg/icon_back.svg';
}

let toggleGrid = () => {
	showingGrid = !showingGrid;

	showGrid(showingGrid);
}

let showGrid = (show:boolean) => {
	showingGrid = show;
	document.documentElement.style.setProperty('--gridColor', show ? 'var(--color5)' : 'rgba(0,0,0,0)');
}

let cycleSky = () => {
	let currentSky = painting.sky;
	++currentSky;

	if (currentSky === SKY_COLORS.length)
		currentSky = 0;
	
	setSkyColor(currentSky);
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
		let spaceChildList = childList[i].children;

		(spaceChildList[0] as HTMLImageElement).src = getBlockURL(painting.background[i]);
		(spaceChildList[1] as HTMLImageElement).src = getBlockURL(painting.foreground[i]);
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

let onClickSpace = (index:number, foregroundImg:HTMLImageElement, backgroundImg:HTMLImageElement, buttons:number) => {
	let left = leftDown(buttons);
	let right = rightDown(buttons);
	let middle = middleDown(buttons);

	let placeForeground = (insertion:number) => {
		painting.foreground[index] = insertion;
				
		foregroundImg.src = getBlockURL(insertion);

		let hash = document.location.hash.substr(1);
		document.location.hash = hash.slice(0, PAINTING_HEADER_SIZE + index) + toBase66(insertion) + hash.slice(PAINTING_HEADER_SIZE + 1 + index);
	}

	let placeBackground = (insertion:number) => {
		painting.background[index] = insertion;
							
		backgroundImg.src = getBlockURL(insertion);

		let hash = document.location.hash.substr(1);
		let offset = PAINTING_HEADER_SIZE + painting.width * painting.height;
		document.location.hash = hash.slice(0, offset + index) + toBase66(insertion) + hash.slice(offset + 1 + index);
	}

	if (left) {
		activeLayer ? placeForeground(hotbar.getBlock()) : placeBackground(hotbar.getBlock());

	} else if (right) {
		/* clear both foreground and background */
		placeBackground(BLOCK_ID_AIR);
		placeForeground(BLOCK_ID_AIR);

	/* just selecting block */
	} else if (middle) {
		let foregroundBlock = painting.foreground[index];

		/* add the first block in this spot that isn't air */

		if (foregroundBlock === BLOCK_ID_AIR) {
			let backgroundBlock = painting.background[index];

			if (backgroundBlock !== BLOCK_ID_AIR)
				hotbar.addBlock(backgroundBlock);

		} else {
			hotbar.addBlock(foregroundBlock);
		}
	}
}

let setSkyColor = (sky:number) => {
	let gridElement = getGrid();
	gridElement.style.backgroundColor = SKY_COLORS[sky].toCSS();

	console.log(SKY_COLORS[sky].toCSS());

	/* edit the painting */
	painting.sky = sky;

	/* edit the hash */
	let hash = document.location.hash.substr(1);
	document.location.hash = hash.slice(0, 2) + toBase66(sky) + hash.slice(3);
}

let createGrid = (painting:Painting) => {
	let gridElement = clearGrid();

	gridElement.style.gridTemplateColumns = '1fr '.repeat(painting.width);
	gridElement.style.gridTemplateRows = '1fr '.repeat(painting.height);

	gridElement.style.setProperty('--paintingWidth', painting.width+'');
	gridElement.style.setProperty('--paintingHeight', painting.height+'');

	setSkyColor(painting.sky);

	for (var i = 0; i < painting.width * painting.height; ++i) {
		let gridSpace = document.createElement('div');
		gridSpace.className = 'space';
		gridElement.appendChild(gridSpace);
		
		let backgroundImg = document.createElement('img');
		backgroundImg.className = 'back';
		backgroundImg.src = getBlockURL(painting.background[i]);
		gridSpace.appendChild(backgroundImg);

		let foregroundImg = document.createElement('img');
		foregroundImg.src = getBlockURL(painting.foreground[i]);
		gridSpace.appendChild(foregroundImg);

		let gridLines = document.createElement('div');
		gridLines.className = 'gridlines';
		gridSpace.appendChild(gridLines);

		let index = i;

		gridSpace.onmousedown = (event:MouseEvent) => {
			onClickSpace(index, foregroundImg, backgroundImg, event.buttons);
		}

		gridSpace.onmouseover = (event:MouseEvent) => {
			onClickSpace(index, foregroundImg, backgroundImg, event.buttons);
		}
	}

	gridElement.addEventListener('contextmenu', event => { 
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

		blockImg.onmousedown = () => {
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
	let newForeground = new Array(newWidth * newHeight).fill(BLOCK_ID_AIR);
	let newBackground = new Array(newWidth * newHeight).fill(BLOCK_ID_AIR);

	let oldWidth = oldPainting.width;
	let oldHeight = oldPainting.height;
	let oldForeground = oldPainting.foreground;
	let oldBackground = oldPainting.background;

	let usingWidth = Math.min(oldWidth, newWidth);
	let usingHeight = Math.min(oldHeight, newHeight);

	/* copy transformed data into new sheet */
	for (let i = 0; i < usingWidth; ++i) {
		for (let j = 0; j < usingHeight; ++j) {
			let oldPosition = j * oldWidth + i;
			let newPosition = (j + offsetY) * newWidth + (i + offsetX);

			newForeground[newPosition] = oldForeground[oldPosition];
			newBackground[newPosition] = oldBackground[oldPosition];
		}
	}

	painting = new Painting(newForeground, newBackground, newWidth, painting.sky);

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
			let fullW = width - painting.width;
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

	/* enter the user into the width input */
	return inputs[2];
}

let createSave = (parent:HTMLDivElement) => {
	let dialogHTML = <string>Handlebars.templates.saveDialog();
	parent.insertAdjacentHTML('beforeend', dialogHTML);

	/* edit functionality */

	let ok = document.getElementById('okButton');
	ok.onclick = () => {
		/* can't spam requests */
		if (!ok.classList.contains('loading')) {
			let fail = (reason:string) => {
				ok.classList.remove('loading');

				let saveInfo = dialog.getElementsByClassName('saveInfo')[0] as HTMLParagraphElement;

				saveInfo.classList.add('bad');
				saveInfo.textContent = reason;
			}

			ok.classList.add('loading');

			let dialog = document.getElementById('dialogBack');
			let input = dialog.getElementsByTagName('input')[0];

			let submitName = input.value;
			if (submitName === '')
				return fail('Please enter a name');

			let nameErr = validateTitle(submitName);
			if (nameErr !== '')
				return fail(nameErr);

			request('/uploadGallery/' + painting.toData() + '/' + submitName).then(() => {
				closeOverlay();

			}).catch(errMessage => {
				if (typeof errMessage === 'string')
					fail(errMessage);
				else
					fail('Unknown error');
			});
		}
	}

	let cancel = document.getElementById('cancelButton') as HTMLButtonElement;
	cancel.onclick = closeOverlay;

	let saveInput = document.getElementById('dialogBack').getElementsByTagName('input')[0];
	return saveInput;
}

let openOverlay = (createDialog:(parent:HTMLDivElement) => HTMLElement) => {
	let overlay = getOverlay();

	/* add the dialog box to the overlay */
	let focus = createDialog(overlay);

	overlay.classList.add('active');

	focus.focus();
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

	showGrid(true);
	setLayer(LAYER_FOREGROUND);

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