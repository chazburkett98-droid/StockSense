import {sampleInventory,validateItem,stockStatus} from './inventory-data.mjs';
const $=selector=>document.querySelector(selector);
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=new Date().toLocaleDateString('en-CA',{timeZone:'America/Chicago'});
let inventory=sampleInventory,inventorySample=true,completed={},customTasks=[];
try{const saved=JSON.parse(localStorage.getItem('stocksense.inventory.v1'));if(saved?.items){inventory=saved.items.map(validateItem);inventorySample=!!saved.isSample;}completed=JSON.parse(localStorage.getItem('bargetown.prep.'+today))||{};const savedTasks=JSON.parse(localStorage.getItem('bargetown.customPrep.'+today));if(Array.isArray(savedTasks))customTasks=savedTasks.filter(task=>typeof task.id==='string'&&typeof task.name==='string'&&Number.isInteger(task.quantity)&&task.quantity>0&&typeof task.time==='string');}catch{}
const find=sku=>inventory.find(item=>item.sku===sku);
const tasks=[{id:'sandwich',sku:'81731',name:'Turkey sandwiches',quantity:Math.max(0,23-(find('81731')?.quantity||0)),time:'Before 11 AM',why:'Lunch is the busiest time. Aim for 23 ready sandwiches.'},{id:'fruit',sku:'81742',name:'Fresh fruit cups',quantity:Math.max(0,18-(find('81742')?.quantity||0)),time:'Before lunch',why:'Have 18 cups ready for the lunch crowd.'}].filter(task=>task.quantity>0&&(inventorySample||find(task.sku)));
tasks.push(...customTasks);
const buyItems=inventory.filter(item=>stockStatus(item)!=='In stock').sort((a,b)=>a.quantity-b.quantity);
function render(){
  $('#todayLabel').textContent=new Date().toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'long',month:'short',day:'numeric'});
  const done=tasks.filter(task=>completed[task.id]).length;
  $('#prepCount').textContent=`${done} of ${tasks.length} done`;
  $('#prepMetric').textContent=tasks.length-done;$('#buyMetric').textContent=buyItems.length;$('#stockMetric').textContent=inventory.length;
  $('#inventorySource').textContent=inventorySample?'Sample inventory':'Your inventory';
  $('#prepRows').innerHTML=tasks.map(task=>`<div class="prep-row ${completed[task.id]?'is-done':''}"><label class="prep-check"><input type="checkbox" data-task="${esc(task.id)}" ${completed[task.id]?'checked':''}/><span class="task-tick" aria-hidden="true"></span><span class="prep-art" aria-hidden="true">${task.id==='sandwich'?'&#129386;':task.id==='fruit'?'&#129373;':'&#10022;'}</span><span class="prep-copy"><span class="suggestion-label">${completed[task.id]?'Ready to go':'Suggested prep'}</span><b>Make ${task.quantity} ${esc(task.name.toLowerCase())}</b><small>${esc(task.time)}</small></span></label>${task.why?`<details class="task-reason"><summary>Why?</summary><p>${esc(task.why)} Sample sales plan.</p></details>`:'<span class="data-label">Your task</span>'}</div>`).join('')||'<p class="quiet-empty">Nothing to make yet. Add today’s prep tasks.</p>';
  $('#buyRows').innerHTML=buyItems.map(item=>`<div class="buy-row ${item.quantity===0?'stock-empty':'stock-low'}"><span class="stock-symbol" aria-hidden="true">${item.quantity===0?'!':'&#8600;'}</span><div class="buy-copy"><span class="stock-status">${stockStatus(item)}</span><b>${esc(item.name)}</b><small><strong>${item.quantity} ${esc(item.unit)} left</strong> &middot; Minimum ${item.reorderPoint}</small></div><a class="compare-btn" href="suppliers.html?sku=${encodeURIComponent(item.sku)}">Compare delivery <span aria-hidden="true">→</span></a></div>`).join('')||'<p class="quiet-empty">Stock levels look good. Browse suppliers when you need more.</p>';
}
$('#prepRows').addEventListener('change',event=>{const id=event.target.dataset.task;if(!tasks.some(task=>task.id===id))return;completed[id]=event.target.checked;try{localStorage.setItem('bargetown.prep.'+today,JSON.stringify(completed));$('#saveStatus').textContent='Saved for today';}catch{$('#saveStatus').textContent='Not saved — browser storage unavailable';}render();});
$('#addPrepBtn').onclick=()=>{$('#prepForm').reset();$('#prepError').textContent='';$('#prepDialog').showModal();};
$('#closePrepDialog').onclick=()=>$('#prepDialog').close();
$('#prepForm').addEventListener('submit',event=>{
  event.preventDefault();const fields=new FormData(event.target);const name=String(fields.get('name')||'').trim();const quantity=Number(fields.get('quantity'));const time=String(fields.get('time')||'Today').trim();
  if(!name||!Number.isInteger(quantity)||quantity<1){$('#prepError').textContent='Add a name and a whole quantity of at least 1.';return;}
  const task={id:'custom-'+Date.now()+'-'+customTasks.length,name,quantity,time};customTasks.push(task);tasks.push(task);
  try{localStorage.setItem('bargetown.customPrep.'+today,JSON.stringify(customTasks));$('#saveStatus').textContent='Saved for today';}catch{$('#saveStatus').textContent='Not saved — browser storage unavailable';}
  $('#prepDialog').close();render();
});
render();

window.addEventListener("storage",event=>{if(event.key==="stocksense.inventory.v1")location.reload();});
