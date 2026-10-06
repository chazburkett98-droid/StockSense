import {sampleInventory,validateItem} from './inventory-data.mjs';
import {suppliers,compareQuotes} from './supplier-data.mjs';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(value);
let inventory=sampleInventory,quotes={},examples=false;
try{const saved=JSON.parse(localStorage.getItem('stocksense.inventory.v1'));if(saved?.items)inventory=saved.items.map(validateItem);quotes=JSON.parse(localStorage.getItem('bargetown.supplierQuotes'))||{};}catch{}
$('#supplierProduct').innerHTML=inventory.map(item=>`<option value="${esc(item.sku)}">${esc(item.name)} · ${esc(item.unit)}</option>`).join('');
const requested=new URLSearchParams(location.search).get('sku');
if(inventory.some(item=>item.sku===requested))$('#supplierProduct').value=requested;
else if(inventory.some(item=>item.sku==='19450'))$('#supplierProduct').value='19450';
const item=()=>inventory.find(item=>item.sku===$('#supplierProduct').value);
const quoteKey=()=>item()?item().sku+'|'+item().name+'|'+item().unit:'';
const emptyQuote=()=>({price:'',fee:'',hours:'',minimum:1,confirmed:false});
function current(){if(!quotes[quoteKey()])quotes[quoteKey()]=Object.fromEntries(suppliers.map(supplier=>[supplier.id,emptyQuote()]));return quotes[quoteKey()];}
function save(){if(examples)return;try{localStorage.setItem('bargetown.supplierQuotes',JSON.stringify(quotes));}catch{$('#quoteModeLabel').textContent='Quotes are not saved. Browser storage is unavailable.';}}
function productLink(supplier){return supplier.search? supplier.search+encodeURIComponent(item().name):supplier.url;}
function resetQuantity(){const product=item();$('#orderQuantity').value=product?Math.max(1,product.reorderPoint*2-product.quantity):1;}
function renderCards(){
  if(!item()){$('#quoteCards').innerHTML='<p class="quiet-empty">Add products to your inventory first.</p>';$('#comparisonSummary').textContent='';return;}
  const data=current();
  $('#quoteCards').innerHTML=suppliers.map(supplier=>{const q=data[supplier.id]||emptyQuote();return `<article class="quote-card" data-supplier="${supplier.id}"><div class="quote-brand"><span class="quote-logo" style="background:${supplier.color}">${supplier.initial}</span><div><h2>${supplier.name}</h2><small>${supplier.note}</small></div></div><a class="quote-source" href="${productLink(supplier)}" target="_blank" rel="noopener">Find product & check delivery ↗</a><details class="quote-editor"><summary>Add / edit quote</summary><div class="quote-fields"><label>Price per ${esc(item().unit==='cases'?'case':item().unit==='bags'?'bag':item().unit==='units'?'unit':item().unit)} ($)<input data-field="price" type="number" min="0" step="0.01" placeholder="Enter price" value="${esc(q.price)}"/></label><label>Delivery fee ($)<input data-field="fee" type="number" min="0" step="0.01" placeholder="Enter fee" value="${esc(q.fee)}"/></label><label>Arrives in (hours)<input data-field="hours" type="number" min="0" step="0.5" placeholder="Enter time" value="${esc(q.hours)}"/></label><label>Minimum quantity<input data-field="minimum" type="number" min="1" step="1" value="${esc(q.minimum)}"/></label></div><label class="confirm-delivery"><input type="checkbox" data-field="confirmed" ${q.confirmed?'checked':''}/> ${examples?'Example address availability':'I confirmed delivery to this address'}</label></details><div class="quote-result" id="result-${supplier.id}"></div><a class="supplier-checkout" href="${productLink(supplier)}" target="_blank" rel="noopener">${examples?'Visit supplier website':'Continue on supplier website'} ↗</a></article>`;}).join('');
  updateResults();
}
function updateResults(){
  if(!item())return;
  const quantity=Number($('#orderQuantity').value);let ranked=[];
  try{ranked=compareQuotes(suppliers.map(supplier=>{const q=current()[supplier.id]||emptyQuote();return {...q,id:supplier.id,price:q.price===''?NaN:Number(q.price),fee:q.fee===''?NaN:Number(q.fee),hours:q.hours===''?NaN:Number(q.hours),minimum:Number(q.minimum)};}),quantity,$('#quoteSort').value);}catch(error){$('#comparisonSummary').textContent=error.message;}
  const best=ranked[0];
  if(Number.isInteger(quantity)&&quantity>0)$('#comparisonSummary').textContent=best?`${examples?'Example: ':''}${suppliers.find(supplier=>supplier.id===best.id).name} has the ${$('#quoteSort').value==='time'?'fastest delivery':'lowest total'} among ${ranked.length} complete ${examples?'example':'confirmed'} ${ranked.length===1?'quote':'quotes'}.`:'Add price, fee, and arrival time. Confirm delivery to include a supplier.';
  for(const supplier of suppliers){const q=ranked.find(q=>q.id===supplier.id);$(`#result-${supplier.id}`).innerHTML=q?`${best.id===q.id&&ranked.length>1?`<span class="quote-badge">${examples?'Example · ':''}${$('#quoteSort').value==='time'?'Fastest':'Lowest total'}</span>`:''}<strong>${money(q.total)}</strong><small>${q.purchaseQuantity} ${esc(item().unit)} · ${q.hours===0?'Same hour':`in ${q.hours} hours`}${q.purchaseQuantity>quantity?' · minimum order applied':''}<br/>${examples?'Example prices, not live quotes':'Your entered quote · confirm at checkout'}</small>`:'<small>Not compared yet.<br/>Add a complete quote and confirm delivery.</small>';}
  // Reorder existing cards without rebuilding inputs or losing entered values.
  const order=[...ranked.map(q=>q.id),...suppliers.filter(supplier=>!ranked.some(q=>q.id===supplier.id)).map(supplier=>supplier.id)];
  for(const id of order)$('#quoteCards').append($(`[data-supplier="${id}"]`));
}
$('#quoteCards').addEventListener('input',event=>{const field=event.target.dataset.field;const card=event.target.closest('[data-supplier]');if(!field||!card)return;current()[card.dataset.supplier][field]=field==='confirmed'?event.target.checked:event.target.value;save();updateResults();});
$('#supplierProduct').onchange=()=>{if(examples){quotes={};try{quotes=JSON.parse(localStorage.getItem('bargetown.supplierQuotes'))||{};}catch{}examples=false;$('#quoteModeLabel').textContent='Live prices aren’t connected. Add current supplier quotes to compare.';$('#exampleQuotesBtn').textContent='Try example quotes';}resetQuantity();renderCards();};
$('#orderQuantity').addEventListener('input',updateResults);$('#quoteSort').onchange=updateResults;
$('#exampleQuotesBtn').onclick=()=>{if(!item())return;if(examples){quotes={};try{quotes=JSON.parse(localStorage.getItem('bargetown.supplierQuotes'))||{};}catch{}examples=false;}else{examples=true;quotes={[quoteKey()]:{walmart:{price:2.2,fee:9.95,hours:3,minimum:1,confirmed:true},sams:{price:1.85,fee:8,hours:6,minimum:6,confirmed:true},gordon:{price:2,fee:12,hours:2,minimum:4,confirmed:true}}};}$('#quoteModeLabel').textContent=examples?'Example comparison only. Prices and delivery times are made up for this mockup.':'Live prices aren’t connected. Add current supplier quotes to compare.';$('#exampleQuotesBtn').textContent=examples?'Use my quotes':'Try example quotes';renderCards();};
$('#supplierSources').innerHTML=suppliers.map(supplier=>`<a href="${supplier.url}" target="_blank" rel="noopener">${supplier.source} ↗</a>`).join('');
resetQuantity();renderCards();
