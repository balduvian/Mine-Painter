/// <reference path='shared.ts'/>

var Handlebars: any;

let getGallery = () => {
	return <HTMLDivElement>document.getElementById('gallery');
}

let request = (url:string) => {
	return new Promise<string>((accept, reject) => {
		let request = new XMLHttpRequest();
		request.open('GET', url);
	
		request.onreadystatechange = () => {
			if (request.readyState === 4)
				request.status === 200 ? accept(request.responseText) : reject();
		}
	
		request.send();
	});
}

let createGalleryItem = (item:GalleryItem) => {
	let gallery = getGallery();

	let galleryHTML = <string>Handlebars.templates.galleryItem(item);

	gallery.insertAdjacentHTML('beforeend', galleryHTML);

	let thisData = item.data;
	let thisDiv = <HTMLDivElement>gallery.lastElementChild;

	(thisDiv.getElementsByClassName('deleteButton')[0] as HTMLElement).onclick = () => {
		deleteGalleryItem(thisData, thisDiv);
	};
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
