import {sampleInventory,validateItem,summarize,stockStatus,filterInventory,parseInventoryCSV,toInventoryCSV} from './inventory-data.mjs';
const $=selector=>document.querySelector(selector);
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
const storageKey='stocksense.inventory.v1';
let items=sampleInventory.map(item=>({...item})),isSample=true,editing=null,storageWarning=false;
try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved&&Array.isArray(saved.items)){const validated=saved.items.map(validateItem);if(new Set(validated.map(item=>item.sku)).size!==validated.length)throw Error('Duplicate saved SKU');items=validated;isSample=!!saved.isSample;}}catch{storageWarning=true;}
const colors=['#00965e','#119f9f','#2989cc','#d69b05','#8070bb','#607c9b'];
const paths=['M3 5h14v12H3zM3 9h14M7 5V3h6v2','M10 2v16M14 5H8a3 3 0 0 0 0 6h4a3 3 0 0 1 0 6H6','M10 3 2 17h16zM10 8v4M10 14h.01','M3 3h5v5H3zM12 3h5v5h-5zM3 12h5v5H3zM12 12h5v5h-5z'];
let toastTimer;
function toast(message){$('#inventoryToast').textContent=message;$('#inventoryToast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#inventoryToast').classList.remove('show'),3500);}
function save(){try{localStorage.setItem(storageKey,JSON.stringify({...JSON.parse(localStorage.getItem(storageKey)||'{}'),items,isSample}));storageWarning=false;return true;}catch{storageWarning=true;return false;}}
function render(){
  const totals=summarize(items);
  $('#dataNote').innerHTML=`<span class="data-label">${isSample?'Sample inventory':'Your inventory'}</span><span>${isSample?'Import your stock list to see your actual store inventory.':'Saved in this browser. Export a copy for your records.'}${storageWarning?' Browser storage is unavailable; changes may not be saved.':''}</span>`;
  const metrics=[['Total products',totals.products,'Unique items in your store'],['Inventory value',money(totals.value),'Based on the unit cost'],['Low stock',totals.low,`${totals.out} ${totals.out===1?'product':'products'} out of stock`],['Categories',totals.categories,'Across your store']];
  $('#inventoryMetrics').innerHTML=metrics.map(([label,value,note],i)=>`<article class="inventory-metric"><span class="metric-label">${label}</span><span class="metric-icon"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="${paths[i]}"/></svg></span><strong>${value}</strong><span class="metric-caption">${note}</span></article>`).join('');
  const categories=[...new Set(items.map(item=>item.category))].sort();
  const currentCategory=$('#categoryFilter').value;
  $('#categoryFilter').innerHTML='<option value="">All categories</option>'+categories.map(category=>`<option value="${escape(category)}">${escape(category)}</option>`).join('');
  $('#categoryFilter').value=categories.includes(currentCategory)?currentCategory:'';
  $('#categoryOptions').innerHTML=categories.map(category=>`<option value="${escape(category)}"></option>`).join('');
  let position=0;
  const categoryValues=categories.map((category,i)=>({name:category,value:items.filter(item=>item.category===category).reduce((sum,item)=>sum+item.quantity*item.unitCost,0),color:colors[i%colors.length]}));
  const stops=categoryValues.map(category=>{const start=position;position+=totals.value?category.value/totals.value*100:0;return `${category.color} ${start}% ${position}%`;});
  $('#categoryBreakdown').innerHTML=`<div class="category-donut" style="background:${totals.value?`conic-gradient(${stops.join(',')})`:'#edf1f5'}" role="img" aria-label="Inventory value by category; amounts are listed alongside"><div class="donut-center"><b>${totals.categories}</b><span>Categories</span></div></div><div class="category-legend">${categoryValues.map(category=>`<div class="legend-row"><i style="background:${category.color}"></i><span>${escape(category.name)}</span><b>${money(category.value)}</b></div>`).join('')||'<span class="form-note">Add products to see your categories.</span>'}</div>`;
  const levels=[['In stock',items.filter(item=>stockStatus(item)==='In stock').length,'#00965e'],['Low stock',totals.low,'#d69b05'],['Out of stock',totals.out,'#c66961']];
  $('#stockLevels').innerHTML=`<div class="stock-levels">${levels.map(([label,count,color])=>`<div class="stock-level-row"><span>${label}</span><div class="stock-level-bar"><i style="width:${totals.products?count/totals.products*100:0}%;background:${color}"></i></div><b>${count}</b></div>`).join('')}</div>`;
  $('#productCount').textContent=totals.products;
  renderRows();
}
function renderRows(){
  const visible=filterInventory(items,{search:$('#inventorySearch').value,category:$('#categoryFilter').value,status:$('#statusFilter').value,sort:$('#inventorySort').value});
  $('#inventoryRows').innerHTML=visible.map(item=>{const status=stockStatus(item);const initial=item.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('');return `<tr><td><div class="product-cell"><span class="product-initial" aria-hidden="true">${escape(initial)}</span><div><strong>${escape(item.name)}</strong><small>SKU ${escape(item.sku)}</small></div></div></td><td>${escape(item.category)}</td><td><span class="stock-count">${item.quantity}<small>${escape(item.unit)}</small></span></td><td>${money(item.unitCost)}</td><td>${money(item.quantity*item.unitCost)}</td><td>${escape(item.location)}</td><td><span class="stock-badge ${status==='Low stock'?'low':status==='Out of stock'?'out':''}">${status}</span></td><td><button class="edit-product" data-edit="${escape(item.sku)}" aria-label="Edit ${escape(item.name)}">Edit</button>${status!=='In stock'?`<a class="stock-action" href="suppliers.html?sku=${encodeURIComponent(item.sku)}">Find delivery →</a>`:''}</td></tr>`;}).join('')||`<tr><td colspan="8" class="empty-cell"><b>${items.length?'No matching products':'Your inventory is empty'}</b>${items.length?'Try another search or filter.':'Add a product or import your stock list.'}</td></tr>`;
  $('#resultsCount').textContent=`Showing ${visible.length} of ${items.length} products`;
}
function openProduct(sku=null){
  editing=sku;const item=sku?items.find(item=>item.sku===sku):{name:'',sku:'',category:'',quantity:0,unit:'units',unitCost:0,reorderPoint:0,location:''};
  if(!item)return;
  const form=$('#productForm');form.reset();
  // Preserve imported pack sizes as an option when editing.
  const unitSelect=form.elements.namedItem('unit');if(![...unitSelect.options].some(option=>option.value===item.unit))unitSelect.add(new Option(item.unit,item.unit));
  for(const [key,value] of Object.entries(item))form.elements.namedItem(key).value=value;
  $('#productError').textContent='';$('#productDialogTitle').textContent=sku?'Edit product':'Add product';$('#productDialog').showModal();
}
function download(text,name){const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('#addBtn').onclick=()=>openProduct();
$('#inventoryRows').addEventListener('click',event=>{const button=event.target.closest('[data-edit]');if(button)openProduct(button.dataset.edit);});
$('#productForm').addEventListener('submit',event=>{
  event.preventDefault();
  try{const item=validateItem(Object.fromEntries(new FormData(event.target)));if(items.some(existing=>existing.sku===item.sku&&existing.sku!==editing))throw Error('That SKU already exists. Use a different SKU.');if(editing)items=items.map(existing=>existing.sku===editing?item:existing);else items.push(item);const saved=save();render();$('#productDialog').close();toast(saved?'Product saved.':'Product updated. Export a copy; browser storage is unavailable.');}catch(error){$('#productError').textContent=error.message;}
});
for(const selector of ['#closeProductDialog','#cancelProductDialog'])$(selector).onclick=()=>$('#productDialog').close();
$('#importBtn').onclick=()=>{$('#inventoryFile').value='';$('#importError').textContent='';$('#importDialog').showModal();};
for(const selector of ['#closeImportDialog','#cancelImportDialog'])$(selector).onclick=()=>$('#importDialog').close();
$('#confirmImportBtn').onclick=async()=>{
  const file=$('#inventoryFile').files[0];if(!file){$('#importError').textContent='Choose a CSV file first.';return;}
  const button=$('#confirmImportBtn');button.disabled=true;
  try{if(file.size>5*1024*1024)throw Error('Use a CSV file smaller than 5 MB.');const parsed=parseInventoryCSV(await file.text());items=parsed;isSample=false;const saved=save();$('#inventorySearch').value='';$('#categoryFilter').value='';$('#statusFilter').value='';render();$('#importDialog').close();toast(saved?`Imported ${items.length} products.`:'Inventory imported. Export a copy; browser storage is unavailable.');}catch(error){$('#importError').textContent=error.message;}finally{button.disabled=false;}
};
$('#exportBtn').onclick=()=>download(toInventoryCSV(items),'stocksense-inventory.csv');
$('#templateBtn').onclick=()=>download('sku,name,category,quantity,unit,unitCost,reorderPoint,location\r\n','stocksense-inventory-template.csv');
$('#inventorySearch').addEventListener('input',renderRows);
for(const selector of ['#categoryFilter','#statusFilter','#inventorySort'])$(selector).addEventListener('change',renderRows);
render();

window.addEventListener("storage",event=>{if(event.key!==storageKey)return;try{const saved=JSON.parse(localStorage.getItem(storageKey));if(saved?.items){items=saved.items.map(validateItem);isSample=!!saved.isSample;render();}}catch{toast("Could not read the updated inventory.");}});
