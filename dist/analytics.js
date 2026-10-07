import {readStore,salesInsights} from './sales-data.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
  try{
    const store=readStore(localStorage),insights=salesInsights(store);
    document.querySelector('#salesInsights').innerHTML=insights.map(({item,current,previous,rate,suggested,trend,enoughHistory})=>{
      const fresh=item.category==='Fresh food';
      const action=suggested?`${fresh?'Prep':'Restock'} ${suggested} ${esc(item.unit)} to reach a three-day sales target or your minimum stock, whichever is higher.`:`Keep watching: ${item.quantity} ${esc(item.unit)} on hand covers the current target.`;
      return `<article class="insight-card"><span class="stock-status">${enoughHistory?esc(trend):'Early sales signal'}</span><h3>${esc(item.name)}</h3><p>${current} ${esc(item.unit)} sold in the last 7 days; ${previous} in the preceding 7 days.</p><p>${rate.toFixed(1)} ${esc(item.unit)}/day over the observed period. ${enoughHistory?'':'Less than two weeks of history; this is a starting estimate.'}</p><div class="insight-action"><b>${action}</b></div><small>Sales-only estimate. Stockouts and missing sales can understate demand.</small><a class="text-link" href="${fresh?'inventory.html':'suppliers.html?sku='+encodeURIComponent(item.sku)}">${fresh?'Review prep stock':'Compare suppliers'} &rarr;</a></article>`;
    }).join('')||'<p class="quiet-empty">Your sales story starts at checkout. Complete a demo sale to see which products are moving and what to prep or restock. No sales trend has been recorded yet.</p>';
    document.querySelector('#salesMovements').innerHTML=store.sales.slice(-20).reverse().map(sale=>`<article class="movement-card"><div><b>${new Date(sale.at).toLocaleString('en-US',{timeZone:'America/Chicago'})}</b><span class="data-label">${sale.source==='local-demo'?'Demo sale':'Paid sale'}</span></div>${sale.lines.map(line=>`<p><strong>${esc(line.name)}</strong><span>&minus;${line.quantity} ${esc(line.unit)} &middot; ${line.before} &rarr; ${line.after} on hand</span></p>`).join('')}<small>Checkout ${esc(sale.id)}</small></article>`).join('')||'<p class="quiet-empty">No completed sales yet. Scanning alone does not create a stock movement.</p>';
  }catch{document.querySelector('#salesInsights').innerHTML='<p class="quiet-empty">Sales records could not be loaded. Check browser storage before recording another sale.</p>';}
}
render();
window.addEventListener('storage',render);
