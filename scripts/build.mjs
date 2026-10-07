import {copyFile,mkdir,writeFile} from 'node:fs/promises';
await mkdir(new URL('../dist/',import.meta.url),{recursive:true});
for(const file of ['index.html','workspace.js','workspace.css','stock-model.mjs','insights-view.mjs'])await copyFile(new URL('../'+file,import.meta.url),new URL('../dist/'+file,import.meta.url));
for(const [file,page] of [['inventory.html','inventory'],['suppliers.html','suppliers'],['checkout.html','sales']])await writeFile(new URL('../dist/'+file,import.meta.url),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Stock Sense</title><meta http-equiv="refresh" content="0;url=./index.html#app/'+page+'"><a href="./index.html#app/'+page+'">Open Stock Sense</a></html>');
console.log('Built Stock Sense into dist/');
