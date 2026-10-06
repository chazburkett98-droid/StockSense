import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sampleInventory,validateItem,stockStatus} from '../inventory-data.mjs';
const source=(await readFile(new URL('../signals.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'');
const memory=new Map();
function boot(){
  const nodes=new Map();
  function get(selector){if(!nodes.has(selector))nodes.set(selector,{textContent:'',innerHTML:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},reset(){},showModal(){this.open=true;},close(){this.open=false;}});return nodes.get(selector);}
  const context={sampleInventory,validateItem,stockStatus,document:{querySelector:get},localStorage:{getItem:key=>memory.get(key)||null,setItem:(key,value)=>memory.set(key,value)},FormData:class{constructor(form){return new Map(Object.entries(form.fields));}}};
  vm.runInNewContext(source,context);return get;
}
let get=boot();
assert.match(get('#prepRows').innerHTML,/Make 15 turkey sandwiches/);
assert.match(get('#prepRows').innerHTML,/Make 4 fresh fruit cups/);
assert.equal(get('#prepMetric').textContent,2);
assert.equal(get('#buyMetric').textContent,2);
assert.match(get('#buyRows').innerHTML,/Compare delivery/);
assert.doesNotMatch(get('#buyRows').innerHTML,/type="checkbox"/);
get('#prepRows').handlers.change({target:{dataset:{task:'sandwich'},checked:true}});
assert.equal(get('#prepMetric').textContent,1);
assert.match(get('#prepRows').innerHTML,/is-done/);
get=boot();assert.equal(get('#prepMetric').textContent,1);
get('#prepRows').handlers.change({target:{dataset:{task:'sandwich'},checked:false}});
assert.equal(get('#prepMetric').textContent,2);
get('#prepForm').handlers.submit({preventDefault(){},target:{fields:{name:'Lunch special portions',quantity:'20',time:'Before noon'}}});
assert.match(get('#prepRows').innerHTML,/Make 20 lunch special portions/);
assert.equal(get('#prepMetric').textContent,3);
get=boot();assert.match(get('#prepRows').innerHTML,/Make 20 lunch special portions/);
const before=get('#prepMetric').textContent;
get('#prepForm').handlers.submit({preventDefault(){},target:{fields:{name:'Bad task',quantity:'-3',time:''}}});
assert.equal(get('#prepMetric').textContent,before);
assert.match(get('#prepError').textContent,/at least 1/);
memory.clear();memory.set('stocksense.inventory.v1',JSON.stringify({items:[{sku:'custom',name:'Local bread',quantity:0,category:'Pantry',unit:'loaves',unitCost:2,reorderPoint:4,location:'Shelf'}],isSample:false}));
get=boot();assert.equal(get('#prepMetric').textContent,0);assert.equal(get('#buyMetric').textContent,1);assert.equal(get('#inventorySource').textContent,'Your inventory');
console.log('Passed: prep completion, undo, persistence, custom tasks, real inventory and restock links.');
