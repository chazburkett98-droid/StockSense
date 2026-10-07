import {readStore,completeSale,inventoryKey} from './sales-data.mjs';
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let cart=[],reference=crypto.randomUUID();
function render(){
  const store=readStore(localStorage);
  $('#productOptions').innerHTML=store.items.map(item=>`<option value="${esc(item.sku)}">${esc(item.name)} (${item.quantity} left)</option>`).join('');
  $('#cartRows').innerHTML=cart.map(line=>{const item=store.items.find(item=>item.sku===line.sku);return `<div class="buy-row"><div><b>${esc(item?.name||line.sku)}</b><small>${line.quantity} ${esc(item?.unit||'units')} &middot; SKU ${esc(line.sku)}</small></div><button class="action-btn" data-remove="${esc(line.sku)}">Remove</button></div>`;}).join('')||'<p class="quiet-empty">Scan a SKU to start a checkout. Stock stays unchanged until you complete the demo sale.</p>';
  $('#completeSale').disabled=!cart.length;
}
$('#scanForm').onsubmit=event=>{
  event.preventDefault();
  try{const sku=$('#scanSku').value.trim(),quantity=Number($('#scanQuantity').value),store=readStore(localStorage),item=store.items.find(item=>item.sku===sku);if(!item)throw Error('SKU not found. Add the product in Inventory first.');if(!Number.isInteger(quantity)||quantity<1)throw Error('Enter a positive whole quantity.');const line=cart.find(line=>line.sku===sku);if((line?.quantity||0)+quantity>item.quantity)throw Error('Not enough stock.');if(line)line.quantity+=quantity;else cart.push({sku,quantity});$('#checkoutStatus').textContent='Added to checkout. Inventory has not changed.';$('#scanSku').value='';render();$('#scanSku').focus();}catch(error){$('#checkoutStatus').textContent=error.message;}
};
$('#cartRows').onclick=event=>{const button=event.target.closest('[data-remove]');if(button){cart=cart.filter(line=>line.sku!==button.dataset.remove);render();}};
$('#completeSale').onclick=async()=>{
  const button=$('#completeSale');button.disabled=true;
  try{await navigator.locks.request('stocksense-store',()=>{const next=completeSale(readStore(localStorage),{id:reference,status:'paid',lines:cart});localStorage.setItem(inventoryKey,JSON.stringify(next));});cart=[];reference=crypto.randomUUID();render();$('#checkoutStatus').textContent='Demo sale recorded. Stock and sales insights are updated. No payment was collected.';}catch(error){$('#checkoutStatus').textContent=error.message;}finally{button.disabled=!cart.length;}
};
window.addEventListener('storage',render);
render();
