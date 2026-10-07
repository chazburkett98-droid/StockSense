import {sampleInventory,validateItem} from './inventory-data.mjs';
export const inventoryKey='stocksense.inventory.v1';
export function readStore(storage){
  const raw=storage.getItem(inventoryKey);
  const saved=raw?JSON.parse(raw):{items:sampleInventory,isSample:true,sales:[]};
  return {...saved,items:saved.items.map(validateItem),sales:Array.isArray(saved.sales)?saved.sales:[]};
}
export function completeSale(store,{id,status,lines,at=new Date().toISOString()}){
  if(status!=='paid')throw Error('Only a paid checkout can reduce inventory.');
  if(typeof id!=='string'||!id.trim())throw Error('A unique checkout reference is required.');
  if(store.sales.some(sale=>sale.id===id))return store;
  if(!Array.isArray(lines)||!lines.length)throw Error('Scan at least one product.');
  const quantities=new Map();
  for(const line of lines){
    if(!Number.isInteger(line.quantity)||line.quantity<1)throw Error('Use positive whole quantities.');
    quantities.set(line.sku,(quantities.get(line.sku)||0)+line.quantity);
  }
  const movements=[...quantities].map(([sku,quantity])=>{
    const item=store.items.find(item=>item.sku===sku);
    if(!item)throw Error('Unknown product: '+sku);
    if(quantity>item.quantity)throw Error('Not enough stock for '+item.name+'.');
    return {sku,name:item.name,unit:item.unit,quantity,before:item.quantity,after:item.quantity-quantity};
  });
  if(!Number.isFinite(Date.parse(at)))throw Error('Invalid checkout date.');
  return {...store,items:store.items.map(item=>({...item,quantity:item.quantity-(quantities.get(item.sku)||0)})),sales:[...store.sales,{id,at,status:'paid',source:'local-demo',lines:movements}]};
}
export function salesInsights(store,now=Date.now()){
  const day=86400000;
  const recent=store.sales.filter(sale=>Date.parse(sale.at)<=now&&Date.parse(sale.at)>now-14*day);
  return store.items.map(item=>{
    let current=0,previous=0;
    for(const sale of recent){const count=sale.lines.filter(line=>line.sku===item.sku).reduce((n,line)=>n+line.quantity,0);if(Date.parse(sale.at)>now-7*day)current+=count;else previous+=count;}
    const first=store.sales.filter(sale=>sale.lines.some(line=>line.sku===item.sku)).reduce((min,sale)=>Math.min(min,Date.parse(sale.at)),now);
    const observedDays=Math.min(7,Math.max(1,(now-first)/day));
    const rate=current/observedDays;
    const suggested=Math.max(0,Math.ceil(Math.max(item.reorderPoint,rate*3)-item.quantity));
    return {item,current,previous,rate,suggested,trend:previous===0?(current?'New sales activity':'No sales yet'):current>previous?'Selling faster':current<previous?'Selling slower':'Steady sales',enoughHistory:first<=now-14*day};
  }).filter(insight=>insight.current||insight.previous).sort((a,b)=>b.current-a.current);
}
