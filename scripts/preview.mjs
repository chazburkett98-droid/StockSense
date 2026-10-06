import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const page = fileURLToPath(new URL('../index.html', import.meta.url));
const portArgument = process.argv.indexOf('--port');
const port = Number(portArgument >= 0 ? process.argv[portArgument + 1] : process.env.PORT || 3000);
const server = createServer(async (request, response) => {
  if (request.url === '/favicon.ico') {
    response.writeHead(204);
    response.end();
    return;
  }
  try {
    const route = request.url?.split('?')[0];
    const asset = {
      '/signals.js':['signals.js','text/javascript'], '/dashboard.css':['dashboard.css','text/css'],
      '/inventory.html':['inventory.html','text/html'], '/inventory':['inventory.html','text/html'],
      '/inventory.js':['inventory.js','text/javascript'], '/inventory.css':['inventory.css','text/css'],
      '/inventory-data.mjs':['inventory-data.mjs','text/javascript'],
      '/market.css':['market.css','text/css'], '/suppliers.html':['suppliers.html','text/html'],
      '/suppliers.js':['suppliers.js','text/javascript'], '/supplier-data.mjs':['supplier-data.mjs','text/javascript']
    }[route];
    const html = await readFile(asset ? new URL('../' + asset[0], import.meta.url) : page);
    response.writeHead(200, { 'Content-Type': (asset ? asset[1] : 'text/html') + '; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(html);
  } catch {
    response.writeHead(500, { 'Content-Type': 'text/plain' });
    response.end('StockSense preview could not load.');
  }
});
server.listen(port, '0.0.0.0', () => {
  console.log(`StockSense preview ready at http://localhost:${port}`);
});
server.on('error', error => {
  console.error(error.message);
  process.exitCode = 1;
});
