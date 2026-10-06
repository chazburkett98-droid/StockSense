import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {suppliers,compareQuotes} from '../supplier-data.mjs';
import {sampleInventory,validateItem} from '../inventory-data.mjs';
const quotes=[{id:'a',price:2,fee:12,hours:2,minimum:1,confirmed:true},{id:'b',price:3,fee:0,hours:5,minimum:1,confirmed:true},{id:'c',price:1,fee:0,hours:1,minimum:30,confirmed:true},{id:'d',price:0,fee:0,hours:0,minimum:1,confirmed:false}];
assert.equal(compareQuotes(quotes,5)[0].id,'b');
assert.equal(compareQuotes(quotes,5,'time')[0].id,'c');
assert.equal(compareQuotes(quotes,5).find(q=>q.id==='c').purchaseQuantity,30);
assert.equal(compareQuotes(quotes,5).find(q=>q.id==='a').total,22);
assert.equal(compareQuotes([{...quotes[0],price:NaN}],5).length,0);
assert.equal(compareQuotes([{...quotes[0],fee:-1}],5).length,0);
assert.throws(()=>compareQuotes(quotes,1.5),/whole quantity/);
const nodes=new Map(),memory=new Map();
function get(selector){if(!nodes.has(selector))nodes.set(selector,{value:selector==='#supplierProduct'?'19450':selector==='#quoteSort'?'price':'',innerHTML:'',textContent:'',handlers:{},append(){},addEventListener(type,fn){this.handlers[type]=fn;}});return nodes.get(selector);}
const context={suppliers,compareQuotes,sampleInventory,validateItem,document:{querySelector:get},location:{search:'?sku=19450'},URLSearchParams,localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)}};
vm.runInNewContext((await readFile(new URL('../suppliers.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,''),context);
assert.equal(get('#orderQuantity').value,20);
assert.match(get('#quoteCards').innerHTML,/Add \/ edit quote/);
get('#exampleQuotesBtn').onclick();
assert.match(get('#quoteModeLabel').textContent,/made up/);
assert.match(get('#comparisonSummary').textContent,/Sam’s Club/);
assert.match(get('#result-sams').innerHTML,/\$45\.00/);
get('#quoteSort').value='time';get('#quoteSort').onchange();
assert.match(get('#comparisonSummary').textContent,/Gordon Food Service/);
get('#exampleQuotesBtn').onclick();assert.doesNotMatch(get('#quoteModeLabel').textContent,/made up/);
assert.equal(memory.size,0); // Example quotes never overwrite real saved quotes.
console.log('Passed: fee-inclusive totals, delivery sorting, minimum quantities, invalid quotes and labeled examples.');
