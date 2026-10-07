import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {simpleInsights} from '../insights-view.mjs';
import * as model from '../stock-model.mjs';
const source=(await readFile(new URL('../workspace.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
let win;
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function boot(saved){
  win=new Window({url:'http://localhost:3000/',settings:{enableJavaScriptEvaluation:true,suppressInsecureJavaScriptEnvironmentWarning:true}});
  Object.assign(win,model,{simpleInsights});if(saved)win.localStorage.setItem(model.KEY,saved);
  win.document.body.innerHTML='<div id="root"></div><dialog id="modal"><div id="modalContent"></div></dialog><div id="toast"></div>';
  win.document.querySelector('#modal').showModal=function(){this.open=true;};win.document.querySelector('#modal').close=function(){this.open=false;};
  win.eval(source);await tick();
}
const q=s=>{const node=win.document.querySelector(s);assert.ok(node,'Missing control: '+s);return node;};
const store=()=>JSON.parse(win.localStorage.getItem(model.KEY));
async function route(path){win.location.hash='#app/'+path;win.dispatchEvent(new win.HashChangeEvent('hashchange'));await tick();}
async function click(action){q('[data-action="'+action+'"]').click();await tick();}
function input(name,value){const node=q('#modalForm [name="'+name+'"]');node.value=String(value);node.dispatchEvent(new win.Event('change',{bubbles:true}));return node;}
async function submit(){const form=q('#modalForm');assert.equal(form.checkValidity(),true,'Invalid controls: '+[...form.elements].filter(x=>x.validity&&!x.validity.valid).map(x=>x.name+'='+x.value+' '+JSON.stringify(x.validity)).join(', '));form.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(q('#modalError').textContent,'','Unexpected form error');}
console.log('Starting interface verification');await boot();console.log('Landing rendered');assert.match(q('#root').textContent,/Less inventory guesswork/);assert.equal(win.document.querySelectorAll('.preview-body .metric-card').length,4);
for(const page of ['overview','inventory','sales','purchasing','customers','suppliers','insights','settings']){console.log('Checking '+page);await route(page);assert.ok(q('main').textContent.length>100);assert.equal(win.document.querySelectorAll('.sidebar [aria-current="page"]').length,1);}
console.log('Checking main workflow');await route('inventory');await click('add-product');input('name','Interface test toolkit');input('sku','UI-100');input('category','Tools');input('cost','12.35');input('price','25.99');input('quantity',0);input('reorderPoint',3);input('locationId','shop');await submit();assert.equal(q('#modal').open,false);
let s=store(),p=s.products.find(p=>p.sku==='UI-100');assert.ok(p);assert.equal(p.costCents,1235);
await route('purchasing');await click('create-purchase');input('supplierId','s1');input('locationId','shop');input('expected','2026-12-15');input('lineProduct',p.id);input('lineQuantity',10);input('linePrice','12.35');await submit();s=store();const po=s.purchases.at(-1);assert.equal(model.orderTotal(po),12350);
await route('purchasing/'+po.id);await click('receive');input('reference','UI-DELIVERY-1');input('receive',4);await submit();assert.equal(model.stock(store(),p.id).onHand,4);assert.equal(store().purchases.at(-1).status,'Partially received');
await click('receive');input('reference','UI-DELIVERY-2');input('receive',6);await submit();assert.equal(model.stock(store(),p.id).onHand,10);assert.equal(store().purchases.at(-1).status,'Received');
await route('sales');await click('create-sale');input('customerId','c1');input('locationId','shop');input('lineProduct',p.id);input('lineQuantity',3);input('linePrice','25.99');await submit();const so=store().orders.at(-1);assert.equal(model.orderTotal(so),7797);
await route('sales/'+so.id);await click('sales-status');assert.equal(store().orders.at(-1).status,'Confirmed');assert.equal(model.stock(store(),p.id).reserved,3);await click('sales-status');assert.equal(store().orders.at(-1).status,'Fulfilled');assert.deepEqual(model.stock(store(),p.id),{onHand:7,reserved:0,available:7,incoming:0});assert.equal(win.document.querySelector('[data-action="sales-status"]'),null);
await route('inventory/'+p.id);assert.match(q('main').textContent,/Order fulfilled/);assert.match(q('main').textContent,/Stock received/);assert.match(q('main').textContent,/Stock by location/);
const saved=win.localStorage.getItem(model.KEY);await win.happyDOM.close();await boot(saved);await route('inventory/'+p.id);assert.equal(model.stock(store(),p.id).onHand,7);assert.match(q('main').textContent,/Order fulfilled/);
await route('inventory');const search=q('[data-filter="search"]');search.value='UI-100';search.dispatchEvent(new win.Event('input',{bubbles:true}));assert.match(q('.category-products').textContent,/Interface test toolkit/);assert.equal(win.document.querySelectorAll('.category-product').length,1);assert.equal(q('.inventory-category').open,true);
await route('customers');await click('add-contact');input('name','Interface customer');input('email','demo@example.com');await submit();assert.ok(store().customers.some(c=>c.name==='Interface customer'));
await route('settings');q('[name="name"]').value='Test business';const settings=q('#settingsForm');settings.dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(store().settings.name,'Test business');
await route('inventory');await click('import');
const file=new win.File(['code,label,count,place,cost,price\nCSV-1,Imported widget,5,Back stockroom,2.15,5.99'],'stock.csv',{type:'text/csv'});
const transfer=new win.DataTransfer();transfer.items.add(file);q('#csvFile').files=transfer.files;q('#csvFile').dispatchEvent(new win.Event('change',{bubbles:true}));await tick();
for(const [name,index] of [['sku',0],['name',1],['quantity',2],['location',3],['unitCost',4],['sellingPrice',5]]){const select=q('#importMapping [name="'+name+'"]');select.value=String(index);select.dispatchEvent(new win.Event('change',{bubbles:true}));}
assert.equal(q('#modalSubmit').disabled,false);assert.match(q('#importPreview').textContent,/Imported widget/);assert.equal(store().products.some(p=>p.sku==='CSV-1'),false,'Preview must not save');await submit();const imported=store().products.find(p=>p.sku==='CSV-1');assert.equal(model.stock(store(),imported.id,'warehouse').onHand,5);
await route('settings');await click('reset');assert.match(q('#modalContent').textContent,/replaces all products/);assert.equal(store().settings.name,'Test business','Opening reset confirmation must not reset');await click('close-modal');assert.equal(store().settings.name,'Test business');
await win.happyDOM.close();console.log('Passed: landing and all 8 pages, actual add-product/purchase/receiving/sales forms, confirm and fulfill controls, detail history, persistent reload, search, contact editing, settings, CSV mapping/preview/confirmation, and reset confirmation.');
