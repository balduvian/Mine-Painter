::compile handlebars
call node node_modules/handlebars/bin/handlebars views/partials/galleryItem.handlebars -f public/galleryItem.js
call node node_modules/handlebars/bin/handlebars views/partials/resizeDialog.handlebars -f public/resizeDialog.js
call node node_modules/handlebars/bin/handlebars views/partials/saveDialog.handlebars -f public/saveDialog.js

::compile server
call tsc server.ts

::compile shared for server
call tsc shared.ts --module CommonJS --target ES6

::compile client stuff into public
call tsc client.ts --module None --outFile public/client.js --target ES6
call tsc gallery.ts --module None --outFile public/gallery.js --target ES6

::run the server
call node server.js