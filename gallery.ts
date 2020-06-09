/// <reference path='shared.ts'/>

var Handlebars: any;

let getGallery = () => {
	return <HTMLDivElement>document.getElementById('gallery');
}

let createGalleryItem = (item:GalleryItem) => {
	let gallery = getGallery();

	let galleryHTML = <string>Handlebars.templates.galleryItem(item);

	gallery.insertAdjacentHTML('beforeend', galleryHTML);

	/* give delete button functionality */
	let thisData = item.data;
	let thisDiv = gallery.lastElementChild as HTMLDivElement;

	(thisDiv.getElementsByClassName('deleteButton')[0] as HTMLElement).onclick = () => {
		deleteGalleryItem(thisData, thisDiv);
	};

	/* set sky color */
	let pictureHolder = thisDiv.getElementsByClassName('pictureHolder')[0] as HTMLDivElement;
	let skyColor = fromBase66(thisData, 2);
	pictureHolder.style.backgroundColor = SKY_COLORS[skyColor].toCSS();

	/* center the image */
	centerImage(thisDiv.getElementsByTagName('img')[0]);
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
		let max = Math.floor((width + 10) / 210);

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
