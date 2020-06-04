::compile our typescript
call tsc server.ts
call tsc public/client.ts --module None

::run the server
call node server.js