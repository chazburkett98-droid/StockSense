export const KEY='stocksense.workspace.v3';
export const uid=()=>globalThis.crypto.randomUUID();
export const cents=value=>{
  const text=String(value).trim();
  if(!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Enter a nonnegative amount with no more than two decimal places.');
  const [whole,fraction='']=text.split('.');const result=Number(whole)*100+Number(fraction.padEnd(2,'0'));
  if(!Number.isSafeInteger(result)||result>100000000)throw Error('Amount is too large.');return result;
};
const whole=(value,label='Quantity')=>{const n=Number(value);if(!Number.isSafeInteger(n)||n<0||n>10000000)throw Error(label+' must be a nonnegative whole number.');return n;};
const text=(value,label)=>{const s=String(value||'').trim();if(!s)throw Error(label+' is required.');return s;};
const product=(s,id)=>{const p=s.products.find(p=>p.id===id);if(!p)throw Error('Product not found.');return p;};
const location=(s,id)=>{if(!s.settings.locations.some(l=>l.id===id))throw Error('Choose a valid location.');return id;};
export function stock(s,productId,locationId){
  const onHand=s.stock.filter(x=>x.productId===productId&&(!locationId||x.locationId===locationId)).reduce((n,x)=>n+x.quantity,0);
  const reserved=s.orders.filter(o=>o.status==='Confirmed'&&(!locationId||o.locationId===locationId)).reduce((n,o)=>n+o.lines.filter(l=>l.productId===productId).reduce((v,l)=>v+l.quantity,0),0);
  const incoming=s.purchases.filter(o=>o.status!=='Cancelled'&&(!locationId||o.locationId===locationId)).reduce((n,o)=>n+o.lines.filter(l=>l.productId===productId).reduce((v,l)=>v+l.quantity-l.received,0),0);
  return {onHand,reserved,available:onHand-reserved,incoming};
}
export const orderTotal=o=>o.lines.reduce((n,l)=>n+l.quantity*l.priceCents,0);
export const inventoryValue=s=>s.products.reduce((n,p)=>n+stock(s,p.id).onHand*p.costCents,0);
function move(s,pid,lid,delta,reason,related='',reservedDelta=0,date=new Date().toISOString()){
  let row=s.stock.find(x=>x.productId===pid&&x.locationId===lid);if(!row){row={productId:pid,locationId:lid,quantity:0};s.stock.push(row);}
  const before=row.quantity;if(before+delta<0)throw Error('Stock cannot fall below zero.');row.quantity+=delta;
  s.movements.push({id:uid(),at:date,productId:pid,locationId:lid,delta,reservedDelta,before,after:row.quantity,reason,related});
}
function activity(s,message,related=''){s.activity.push({id:uid(),at:new Date().toISOString(),message,related});}
function checkLines(s,lines,priceKey){
  if(!Array.isArray(lines)||!lines.length)throw Error('Add at least one product line.');
  const seen=new Set();return lines.map(line=>{const p=product(s,line.productId);if(seen.has(p.id))throw Error('Each product can appear only once.');seen.add(p.id);const quantity=whole(line.quantity);if(!quantity)throw Error('Each line needs at least one unit.');const priceCents=whole(line.priceCents??p[priceKey],'Price');if(priceCents>100000000)throw Error('Price is too large.');return {productId:p.id,quantity,priceCents};});
}
export function apply(state,command){
  const s=structuredClone(state);const d=command.data||{};
  if(command.token&&s.applied.includes(command.token))return s;
  switch(command.type){
    case 'product':{
      const existing=d.id?product(s,d.id):null;
      const p={id:existing?.id||uid(),name:text(d.name,'Product name'),sku:text(d.sku,'SKU'),category:text(d.category,'Category'),supplierId:d.supplierId||'',reorderPoint:whole(d.reorderPoint,'Reorder point'),costCents:whole(d.costCents,'Unit cost'),priceCents:whole(d.priceCents,'Selling price')};
      if(s.products.some(x=>x.sku.toLowerCase()===p.sku.toLowerCase()&&x.id!==p.id))throw Error('This SKU already exists.');
      if(p.supplierId&&!s.suppliers.some(x=>x.id===p.supplierId))throw Error('Supplier not found.');
      if(existing)s.products=s.products.map(x=>x.id===p.id?p:x);else {s.products.push(p);const qty=whole(d.quantity||0);move(s,p.id,location(s,d.locationId),qty,'Opening stock');}
      activity(s,`${existing?'Updated':'Added'} product ${p.name}`);break;
    }
    case 'adjust':{
      const p=product(s,d.productId),lid=location(s,d.locationId),reason=text(d.reason,'Adjustment reason');
      const quantity=whole(d.quantity),current=stock(s,p.id,lid);if(quantity<current.reserved)throw Error('On hand cannot be lower than reserved stock. Cancel the matching order first.');
      if(quantity===current.onHand)throw Error('Enter a different stock count.');
      move(s,p.id,lid,quantity-current.onHand,reason);activity(s,`Adjusted ${p.name}: ${reason}`);break;
    }
    case 'sales-create':{
      if(!s.customers.some(x=>x.id===d.customerId))throw Error('Choose a customer.');
      const o={id:uid(),number:'SO-'+String(s.nextSales++).padStart(4,'0'),customerId:d.customerId,locationId:location(s,d.locationId),at:new Date().toISOString(),status:'Draft',lines:checkLines(s,d.lines,'priceCents')};
      if(!Number.isSafeInteger(orderTotal(o)))throw Error('Order total is too large.');s.orders.push(o);activity(s,`Created ${o.number}`,o.number);break;
    }
    case 'sales-status':{
      const o=s.orders.find(o=>o.id===d.id);if(!o)throw Error('Order not found.');
      if(o.status===d.status)throw Error('This order is already '+d.status.toLowerCase()+'.');
      if(d.status==='Confirmed'&&o.status==='Draft'){
        for(const l of o.lines)if(stock(s,l.productId,o.locationId).available<l.quantity)throw Error(`Insufficient available stock for ${product(s,l.productId).name}.`);
        o.status='Confirmed';for(const l of o.lines)move(s,l.productId,o.locationId,0,'Order confirmed',o.number,l.quantity);
      }else if(d.status==='Fulfilled'&&o.status==='Confirmed'){
        for(const l of o.lines)if(stock(s,l.productId,o.locationId).onHand<l.quantity)throw Error('Insufficient physical stock.');
        for(const l of o.lines)move(s,l.productId,o.locationId,-l.quantity,'Order fulfilled',o.number,-l.quantity);
        o.status='Fulfilled';o.fulfilledAt=new Date().toISOString();
      }else if(d.status==='Cancelled'&&['Draft','Confirmed'].includes(o.status)){
        if(o.status==='Confirmed')for(const l of o.lines)move(s,l.productId,o.locationId,0,'Order cancelled',o.number,-l.quantity);
        o.status='Cancelled';
      }else throw Error('This status change is not allowed.');
      activity(s,`${d.status} ${o.number}`,o.number);break;
    }
    case 'purchase-create':{
      if(!s.suppliers.some(x=>x.id===d.supplierId))throw Error('Choose a supplier.');
      if(!/^\d{4}-\d{2}-\d{2}$/.test(d.expected||'')||!Number.isFinite(Date.parse(d.expected))||new Date(d.expected).toISOString().slice(0,10)!==d.expected)throw Error('Choose a valid expected delivery date.');
      const o={id:uid(),number:'PO-'+String(s.nextPurchase++).padStart(4,'0'),supplierId:d.supplierId,locationId:location(s,d.locationId),expected:d.expected,at:new Date().toISOString(),status:'Open',lines:checkLines(s,d.lines,'costCents').map(l=>({...l,received:0})),receipts:[]};
      if(!Number.isSafeInteger(orderTotal(o)))throw Error('Order total is too large.');s.purchases.push(o);activity(s,`Created ${o.number}`,o.number);break;
    }
    case 'receive':{
      const o=s.purchases.find(o=>o.id===d.id);if(!o||!['Open','Partially received'].includes(o.status))throw Error('This purchase order is not open for receiving.');
      const reference=text(d.reference,'Delivery reference');if(o.receipts.some(x=>x.reference.toLowerCase()===reference.toLowerCase()))throw Error('This delivery reference has already been received.');
      const seen=new Set();let total=0;
      for(const entry of d.lines){if(seen.has(entry.productId))throw Error('Duplicate receiving line.');seen.add(entry.productId);const line=o.lines.find(l=>l.productId===entry.productId);if(!line)throw Error('Product is not on this purchase order.');entry.quantity=whole(entry.quantity);if(entry.quantity>line.quantity-line.received)throw Error('Cannot receive more than the outstanding quantity.');total+=entry.quantity;}
      if(!total)throw Error('Enter at least one received unit.');
      for(const entry of d.lines){if(!entry.quantity)continue;const line=o.lines.find(l=>l.productId===entry.productId);line.received+=entry.quantity;move(s,line.productId,o.locationId,entry.quantity,'Stock received: '+reference,o.number);}
      o.receipts.push({reference,at:new Date().toISOString(),lines:structuredClone(d.lines)});o.status=o.lines.every(l=>l.received===l.quantity)?'Received':'Partially received';activity(s,`Received stock for ${o.number}`,o.number);break;
    }
    case 'contact':{
      const key=d.kind==='supplier'?'suppliers':'customers';const record={id:d.id||uid(),name:text(d.name,'Name'),email:String(d.email||'').trim(),phone:String(d.phone||'').trim(),address:String(d.address||'').trim()};
      if(record.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email))throw Error('Enter a valid email.');
      if(d.id){if(!s[key].some(x=>x.id===d.id))throw Error('Contact not found.');s[key]=s[key].map(x=>x.id===d.id?record:x);}else s[key].push(record);activity(s,`Saved ${d.kind} ${record.name}`);break;
    }
    case 'settings':{
      const name=text(d.name,'Business name');if(!['USD','EUR','GBP','CAD','AUD'].includes(d.currency))throw Error('Choose a supported currency.');
      const locations=d.locations.map(l=>({id:l.id||uid(),name:text(l.name,'Location name')}));if(!locations.length)throw Error('Keep at least one location.');
      if(new Set(locations.map(l=>l.name.toLowerCase())).size!==locations.length)throw Error('Location names must be different.');
      for(const old of s.settings.locations)if(!locations.some(l=>l.id===old.id))throw Error('Existing locations cannot be removed while demo records reference them.');
      s.settings={...s.settings,name,currency:d.currency,defaultReorder:whole(d.defaultReorder,'Default reorder point'),locations};activity(s,'Updated business settings');break;
    }
    case 'import':{
      const defaultLocation=location(s,d.locationId);if(!d.rows.length)throw Error('The import has no products.');const seen=new Set();
      for(const row of d.rows){const lid=row.location? s.settings.locations.find(l=>l.name.toLowerCase()===row.location.trim().toLowerCase())?.id:defaultLocation;if(!lid)throw Error('Unknown location: '+row.location);const sku=text(row.sku,'SKU');const key=sku.toLowerCase()+':'+lid;if(seen.has(key))throw Error('Duplicate SKU at the same location in file: '+sku);seen.add(key);const old=s.products.find(p=>p.sku.toLowerCase()===sku.toLowerCase());
        const p={id:old?.id||uid(),sku,name:text(row.name,'Name'),category:String(row.category||old?.category||'General').trim(),supplierId:old?.supplierId||'',reorderPoint:whole(row.reorderPoint??old?.reorderPoint??s.settings.defaultReorder,'Reorder point'),costCents:row.unitCost===undefined?old?.costCents||0:cents(row.unitCost||'0'),priceCents:row.sellingPrice===undefined?old?.priceCents||0:cents(row.sellingPrice||'0')};
        const qty=whole(row.quantity);if(qty<stock(s,p.id,lid).reserved)throw Error(sku+': quantity is below reserved stock.');
        if(old)s.products=s.products.map(x=>x.id===p.id?p:x);else s.products.push(p);
        const delta=qty-stock(s,p.id,lid).onHand;if(delta||!old)move(s,p.id,lid,delta,'CSV import');
      }activity(s,`Imported ${d.rows.length} products`);break;
    }
    default:throw Error('Unknown action.');
  }
  if(command.token)s.applied.push(command.token);return s;
}
export function insights(s,now=Date.now()){
  const days=Math.min(28,Math.max(1,Math.floor((now-Date.parse(s.observationStart))/86400000)));
  const sales=s.orders.filter(o=>o.status==='Fulfilled'&&Date.parse(o.fulfilledAt)>now-28*86400000&&Date.parse(o.fulfilledAt)<=now);
  return s.products.map(p=>{const matching=sales.filter(o=>o.lines.some(l=>l.productId===p.id));const sold=matching.reduce((n,o)=>n+o.lines.filter(l=>l.productId===p.id).reduce((v,l)=>v+l.quantity,0),0);const saleDays=new Set(matching.map(o=>o.fulfilledAt.slice(0,10))).size;const enough=days>=14&&saleDays>=3;const counts=stock(s,p.id),rate=sold/days;
    return {product:p,...counts,sold,days,rate,enough,daysLeft:enough&&rate>0?counts.available/rate:null,recommendation:Math.max(0,Math.ceil(Math.max(p.reorderPoint,enough?rate*7:0)-counts.available-counts.incoming))};
  }).sort((a,b)=>b.sold-a.sold);
}
export function parseCSV(source){
  source=source.replace(/^\uFEFF/,'');const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length)throw Error('Invalid CSV quote.');else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){row.push(cell);if(row.some(c=>c.trim()))rows.push(row);row=[];cell='';if(c==='\r'&&source[i+1]==='\n')i++;}else cell+=c;}
  if(quoted)throw Error('Unclosed CSV quote.');row.push(cell);if(row.some(c=>c.trim()))rows.push(row);if(rows.length<2)throw Error('Include a header and at least one product.');if(rows.some(r=>r.length!==rows[0].length))throw Error('Every CSV row must have the same number of fields.');return rows;
}
export function seed(){
  const now=Date.now(),ago=n=>new Date(now-n*86400000).toISOString();
  const s={version:3,demoPersona:'bargetown',settings:{name:'Bargetown Market',currency:'USD',defaultReorder:8,locations:[{id:'shop',name:'Sales floor'},{id:'warehouse',name:'Back stockroom'}]},observationStart:ago(35),products:[],stock:[],orders:[],purchases:[],movements:[],activity:[],applied:[],nextSales:1042,nextPurchase:2081,
    customers:[{id:'c1',name:'Walk-in shoppers',email:'',phone:'',address:'Example counter sales'}, {id:'c2',name:'Lunch pickup customer',email:'pickup@example.com',phone:'',address:'Example grab-and-go pickup'}, {id:'c3',name:'Neighborhood regular',email:'',phone:'',address:'Example customer account'}],
    suppliers:[{id:'s1',name:'Regional grocery distributor',email:'grocery@example.com',phone:'',address:'Example supplier · snacks, pantry, and dairy'}, {id:'s2',name:'Beverage & dairy distributor',email:'delivery@example.com',phone:'',address:'Example supplier · drinks and chilled essentials'}, {id:'s3',name:'Local bakery & deli',email:'fresh@example.com',phone:'',address:'Example supplier · bread and grab-and-go food'}]};
  const products=[['Turkey sandwich','81731','Fresh food','s3',12,320,649,56,0],['Bottled water, 20 oz','19425','Drinks','s2',24,55,179,84,40],['Chicken salad wrap','81733','Fresh food','s3',10,300,599,45,0],['BBQ chips, 2 oz','64308','Snacks','s1',16,80,199,28,24],['Cola, 12 oz can','19444','Drinks','s2',24,65,179,64,48],['Ice bags, 7 lb','28420','Frozen','s1',8,150,349,5,1],['Mixed fruit cup','81742','Fresh food','s3',8,210,449,14,0],['Chocolate bar','64340','Snacks','s1',12,90,199,36,24],['White bread loaf','52120','Pantry','s3',10,170,349,22,8],['Whole milk, half gallon','52108','Dairy','s2',12,260,449,3,2],['Paper towels, roll','71010','Essentials','s1',6,125,299,11,5],['Orange juice, 16 oz','19450','Drinks','s2',10,180,349,0,0]];
  products.forEach(([name,sku,category,supplierId,reorderPoint,costCents,priceCents,q,w],i)=>{const p={id:'p'+i,name,sku,category,supplierId,reorderPoint,costCents,priceCents};s.products.push(p);move(s,p.id,'shop',q,'Opening stock','',0,ago(35));move(s,p.id,'warehouse',w,'Opening stock','',0,ago(35));});
  for(let i=27;i>=1;i-=2){const lines=[{productId:'p1',quantity:2+(i%3),priceCents:179},{productId:i%3?'p0':'p2',quantity:1+(i%2),priceCents:i%3?649:599}];const number='SO-'+String(1000+i);s.orders.push({id:'seed'+i,number,customerId:i%3?'c1':'c2',locationId:'shop',at:ago(i+1),fulfilledAt:ago(i),status:'Fulfilled',lines});for(const l of lines)move(s,l.productId,'shop',-l.quantity,'Order fulfilled',number,0,ago(i));}
  s.orders.push({id:'draft1',number:'SO-1040',customerId:'c2',locationId:'shop',at:ago(1),status:'Draft',lines:[{productId:'p6',quantity:4,priceCents:449}]});
  s.orders.push({id:'confirmed1',number:'SO-1041',customerId:'c2',locationId:'shop',at:ago(1),status:'Confirmed',lines:[{productId:'p0',quantity:3,priceCents:649}]});move(s,'p0','shop',0,'Order confirmed','SO-1041',3,ago(1));
  s.purchases.push({id:'purchase1',number:'PO-2080',supplierId:'s2',locationId:'shop',expected:new Date(now+3*86400000).toISOString().slice(0,10),at:ago(2),status:'Partially received',lines:[{productId:'p9',quantity:20,received:5,priceCents:260},{productId:'p11',quantity:30,received:0,priceCents:180}],receipts:[{reference:'SEED-DELIVERY-1',at:ago(1),lines:[{productId:'p9',quantity:5}]}]});move(s,'p9','shop',5,'Stock received: SEED-DELIVERY-1','PO-2080',0,ago(1));
  s.activity=[{id:uid(),at:ago(1),message:'Confirmed lunch pickup SO-1041',related:'SO-1041'},{id:uid(),at:ago(1),message:'Received 5 milk cartons for PO-2080',related:'PO-2080'}];return s;
}
export function personalizeBargetown(s){
  if(s.demoPersona==='bargetown')return s;
  const next=structuredClone(s),fresh=seed();
  if(next.settings.name==='Harbor Supply & Repair')next.settings.name='Bargetown Market';
  for(const l of next.settings.locations){if(l.id==='shop'&&l.name==='Main shop')l.name='Sales floor';if(l.id==='warehouse'&&l.name==='Stockroom')l.name='Back stockroom';}
  const originals=[['TL-100','Precision screwdriver set','Tools',1290,2490,'s1',12],['EL-210','USB-C charging cable','Electronics',450,1290,'s2',15],['BK-305','Bike brake pads','Repair parts',680,1800,'s2',10],['SP-410','Nitrile gloves, box','Workshop supplies',720,1490,'s1',8],['PK-520','Packing tape, roll','Packaging',210,590,'s3',12],['TL-130','LED work light','Tools',1850,3490,'s1',6],['BK-310','Universal inner tube','Repair parts',390,990,'s2',10],['SP-430','Microfiber cloth, pack','Workshop supplies',320,790,'s1',8],['PK-540','Shipping box, medium','Packaging',125,350,'s3',20],['EL-240','Portable power bank','Electronics',1450,2990,'s2',8],['TL-150','Adjustable wrench','Tools',850,1990,'s1',6],['EL-260','Replacement fuse, pack','Electronics',180,490,'s2',10]];
  const mapped=new Set();
  originals.forEach(([sku,name,category,cost,price,supplier,reorder],i)=>{const p=next.products.find(p=>p.id==='p'+i&&p.sku===sku&&p.name===name),replacement=fresh.products[i];if(!p||next.products.some(x=>x.id!==p.id&&x.sku.toLowerCase()===replacement.sku.toLowerCase()))return;mapped.add(p.id);p.sku=replacement.sku;p.name=replacement.name;if(p.category===category)p.category=replacement.category;if(p.costCents===cost)p.costCents=replacement.costCents;if(p.priceCents===price)p.priceCents=replacement.priceCents;if(p.supplierId===supplier)p.supplierId=replacement.supplierId;if(p.reorderPoint===reorder)p.reorderPoint=replacement.reorderPoint;});
  for(const o of next.orders.filter(o=>/^seed\d+$/.test(o.id)||['draft1','confirmed1'].includes(o.id)))for(const l of o.lines)if(mapped.has(l.productId)){const i=Number(l.productId.slice(1));if(l.priceCents===originals[i][4])l.priceCents=fresh.products[i].priceCents;}
  for(const o of next.purchases.filter(o=>o.id==='purchase1'))for(const l of o.lines)if(mapped.has(l.productId)){const i=Number(l.productId.slice(1));if(l.priceCents===originals[i][3])l.priceCents=fresh.products[i].costCents;}
  for(const [key,names] of [['customers',['Oak Street Workshop','Riverside Bikes','Walk-in customer']],['suppliers',['Northline Tools','Coastline Components','Everyday Packaging']]])next[key]=next[key].map(c=>{const index=names.indexOf(c.name);const expectedId=(key==='customers'?'c':'s')+(index+1);if(index<0||c.id!==expectedId)return c;const originalEmails=key==='customers'?['orders@example.com','service@example.com','']:['sales@example.com','parts@example.com','supply@example.com'];return {...fresh[key][index],email:c.email===originalEmails[index]?fresh[key][index].email:c.email,phone:c.phone,address:c.address};});
  for(const c of next.customers){const original=['Local trade customer','Retail and repair'];if(original.includes(c.address))c.address=fresh.customers.find(x=>x.id===c.id)?.address||c.address;}
  for(const c of next.suppliers){const original=['Tools and workshop supplies','Repair parts distributor','Packaging and consumables'];if(original.includes(c.address))c.address=fresh.suppliers.find(x=>x.id===c.id)?.address||c.address;}
  for(const a of next.activity)if(a.message==='Received 5 power banks for PO-2080'&&mapped.has('p9'))a.message='Received 5 milk cartons for PO-2080';
  next.demoPersona='bargetown';return next;
}
export function load(storage){const raw=storage.getItem(KEY);if(!raw){const initial=seed();storage.setItem(KEY,JSON.stringify(initial));return initial;}const s=JSON.parse(raw);if(s.version!==3||!s.settings?.name||!Array.isArray(s.settings.locations)||!s.settings.locations.length||!['products','stock','orders','purchases','movements','activity','customers','suppliers','applied'].every(key=>Array.isArray(s[key]))||!Number.isFinite(Date.parse(s.observationStart)))throw Error('Saved demo data could not be read. Export or reset the demo in Settings.');if(s.demoPersona!=='bargetown'){const updated=personalizeBargetown(s);storage.setItem(KEY+'.before-bargetown',raw);storage.setItem(KEY,JSON.stringify(updated));return updated;}return s;}
export async function commit(storage,command,locks=globalThis.navigator?.locks){
  const run=()=>{const next=apply(load(storage),command);storage.setItem(KEY,JSON.stringify(next));return next;};
  return locks?locks.request('stocksense-v3',run):run();
}
