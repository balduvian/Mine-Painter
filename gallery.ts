/// <reference path='shared.ts'/>

var Handlebars: any;

let getGallery = () => {
	return <HTMLDivElement>document.getElementById('gallery');
}

let createGalleryItem = (item:GalleryItem) => {
	let gallery = getGallery();

	let galleryHTML = <string>Handlebars.templates.galleryItem(item);

	gallery.insertAdjacentHTML('beforeend', galleryHTML);

	let thisData = item.data;
	let thisDiv = gallery.lastElementChild as HTMLDivElement;

	/* center the image */
	let img = thisDiv.getElementsByTagName('img')[0];
	img.onload = () => centerImage(img);

	/* set sky color */
	let pictureHolder = thisDiv.getElementsByClassName('pictureHolder')[0] as HTMLDivElement;
	let skyColor = fromBase66(thisData, 2);
	pictureHolder.style.backgroundColor = SKY_COLORS[skyColor].toCSS();

	/* give delete button functionality */
	(thisDiv.getElementsByClassName('deleteButton')[0] as HTMLButtonElement).onclick = () => {
		deleteGalleryItem(thisData, thisDiv);
	};

	/* add input functionality */
	let title = thisDiv.getElementsByClassName('itemName')[0] as HTMLParagraphElement;
	let nameInput = thisDiv.getElementsByTagName('input')[0];

	title.onclick = () => {
		nameInput.classList.add('active');
		nameInput.value = title.textContent;
		nameInput.disabled = false;
		nameInput.focus();

		title.classList.remove('active');
	};

	let closeInput = () => {
		nameInput.classList.remove('active');
		title.classList.add('active');
	}

	let submitName = (name:string) => {
		nameInput.disabled = true;
		nameInput.blur();

		request('/renameGallery/' + thisData + '/' + name).then(response => {
			title.textContent = name;
			closeInput();
		}).catch(() => {
			closeInput();
		});
	}

	/* when you leave the input or press enter */
	nameInput.onblur = () => submitName(nameInput.value);
	nameInput.onkeydown = (event) => {if (event.keyCode === 13) submitName(nameInput.value);};
}

let centerImage = (img:HTMLImageElement) => {
	if (img.naturalWidth > img.naturalHeight) {
		img.classList.add('wideImg');
	} else {
		img.classList.add('tallImg');
	}
}

let deleteGalleryItem = (data:string, div:HTMLDivElement) => {
	request('/deleteGalleryItem/' + data).then(() => {
		div.remove();
	});
}

let galleryResize = (width:number, gallery:HTMLDivElement) => {
	let getColumns = (width:number) => {
		let max = Math.floor((width - 10) / 210);

		if (max < 1)
			max = 1; 
		else if (max > 5)
			max = 5;

		return max;
	};

	let columns = getColumns(width);

	gallery.style.setProperty('--columns', columns+'');
}

let onStartGallery = () => {
	request('/galleryList').then(response => {
		let list = <GalleryItem[]>JSON.parse(response);

		list.forEach(item => createGalleryItem(item));
	});

	/* apply screen resizer */
	let gallery = getGallery();
	window.onresize = () => {
		galleryResize(document.body.clientWidth, gallery);
	}

	/* initially apply resize */
	galleryResize(document.body.clientWidth, gallery);
}

/* entry point */
onStartGallery();
