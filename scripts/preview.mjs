import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const argument=process.argv.indexOf('--port');
const port=Number(argument>=0?process.argv[argument+1]:process.env.PORT||3000);
const files=new Set(['index.html','workspace.js','workspace.css','stock-model.mjs','insights-view.mjs']);
const redirects={'/inventory.html':'inventory','/inventory':'inventory','/suppliers.html':'suppliers','/checkout.html':'sales'};
createServer(async(request,response)=>{
 const route=(request.url||'/').split('?')[0];
 if(redirects[route]){response.writeHead(302,{Location:'/#app/'+redirects[route]});response.end();return;}
 if(route==='/favicon.ico'){response.writeHead(204);response.end();return;}
 const file=route==='/'||route==='/app'?'index.html':route.slice(1);
 if(!files.has(file)){response.writeHead(404,{'Content-Type':'text/plain'});response.end('Page not found');return;}
 try{const body=await readFile(new URL('../'+file,import.meta.url));response.writeHead(200,{'Content-Type':(file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'text/javascript')+'; charset=utf-8','Cache-Control':'no-store'});response.end(body);}catch{response.writeHead(500);response.end('Stock Sense could not load.');}
}).listen(port,'0.0.0.0',()=>console.log('Stock Sense ready at http://localhost:'+port)).on('error',error=>{console.error(error.message);process.exitCode=1;});
