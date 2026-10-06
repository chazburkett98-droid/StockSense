export const sampleInventory = [
  ['81731','Turkey sandwich','Fresh food',8,'units',3.2,10,'Front cooler'],
  ['81733','Chicken salad wrap','Fresh food',38,'units',3,12,'Front cooler'],
  ['81740','Greek yogurt, 5.3 oz','Fresh food',26,'units',1.15,12,'Front cooler'],
  ['81742','Mixed fruit cup','Fresh food',14,'units',2.1,8,'Front cooler'],
  ['19425','Bottled water, 24-pack','Drinks',16,'cases',12,8,'Aisle 1'],
  ['19431','Sparkling water, lime','Drinks',42,'units',0.85,18,'Aisle 1'],
  ['19444','Cola, 12-pack','Drinks',12,'cases',7.5,6,'Aisle 1'],
  ['19450','Orange juice, 16 oz','Drinks',0,'units',1.8,10,'Front cooler'],
  ['28401','Vanilla ice cream pint','Frozen',24,'units',4.8,12,'Freezer'],
  ['28409','Chocolate ice cream pint','Frozen',18,'units',4.8,12,'Freezer'],
  ['28420','Ice bags, 7 lb','Frozen',6,'bags',1.5,8,'Freezer'],
  ['64308','BBQ chips, 2 oz','Snacks',82,'units',0.8,24,'Aisle 2'],
  ['64310','Sea salt chips, 2 oz','Snacks',54,'units',0.8,24,'Aisle 2'],
  ['64328','Trail mix, 4 oz','Snacks',32,'units',1.65,12,'Aisle 2'],
  ['64340','Chocolate bar','Snacks',64,'units',0.9,24,'Checkout'],
  ['52101','Imported ground coffee','Pantry',18,'bags',8,8,'Aisle 3'],
  ['52108','Whole milk, half gallon','Pantry',10,'units',2.6,8,'Back cooler'],
  ['52120','White bread loaf','Pantry',22,'units',1.7,10,'Aisle 3']
].map(([sku,name,category,quantity,unit,unitCost,reorderPoint,location])=>({sku,name,category,quantity,unit,unitCost,reorderPoint,location}));

export function validateItem(item){
  const result={};
  for(const key of ['sku','name','category','unit','location'])result[key]=String(item[key]??'').trim();
  if(!result.sku || !result.name)throw Error('Each product needs a SKU and name.');
  result.category ||= 'Uncategorized'; result.unit ||= 'units'; result.location ||= 'Not set';
  for(const key of ['quantity','unitCost','reorderPoint']){
    const value=item[key]??0;
    if(String(value).trim()==='')result[key]=0;else result[key]=Number(value);
    if(!Number.isFinite(result[key]) || result[key]<0)throw Error(`${result.name}: ${key} must be zero or greater.`);
  }
  if(!Number.isInteger(result.quantity)||!Number.isInteger(result.reorderPoint))throw Error(`${result.name}: stock counts must be whole numbers.`);
  return result;
}
export const stockStatus = item => item.quantity===0?'Out of stock':item.quantity<=item.reorderPoint?'Low stock':'In stock';
export function summarize(items){
  return {products:items.length,value:items.reduce((sum,item)=>sum+item.quantity*item.unitCost,0),low:items.filter(item=>item.quantity>0&&item.quantity<=item.reorderPoint).length,out:items.filter(item=>item.quantity===0).length,categories:new Set(items.map(item=>item.category)).size};
}
export function filterInventory(items,{search='',category='',status='',sort='name'}={}){
  const term=search.trim().toLowerCase();
  return items.filter(item=>(!term||[item.name,item.sku,item.location].some(value=>value.toLowerCase().includes(term)))&&(!category||item.category===category)&&(!status||stockStatus(item)===status)).sort((a,b)=>sort==='quantity'?a.quantity-b.quantity||a.name.localeCompare(b.name):sort==='value'?b.quantity*b.unitCost-a.quantity*a.unitCost:a.name.localeCompare(b.name));
}
export function parseInventoryCSV(text){
  const rows=[];let row=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length){throw Error('Invalid quote in CSV.');}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){row.push(cell);if(row.some(value=>value.trim()))rows.push(row);row=[];cell='';if(c==='\r'&&text[i+1]==='\n')i++;}
    else cell+=c;
  }
  if(quoted)throw Error('A quoted CSV field is not closed.');
  row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
  if(rows.length<2)throw Error('Add at least one product below the CSV headers.');
  const headers=rows.shift().map(value=>value.trim());
  for(const key of ['sku','name','quantity'])if(!headers.includes(key))throw Error(`Missing CSV column: ${key}.`);
  if(new Set(headers).size!==headers.length)throw Error('CSV column names must be unique.');
  const items=rows.map((values,index)=>{if(values.length!==headers.length)throw Error(`Row ${index+2} has the wrong number of columns.`);return validateItem(Object.fromEntries(headers.map((key,i)=>[key,values[i]])));});
  if(new Set(items.map(item=>item.sku)).size!==items.length)throw Error('Each product needs a unique SKU.');
  return items;
}
export function toInventoryCSV(items){
  const headers=['sku','name','category','quantity','unit','unitCost','reorderPoint','location'];
  const cell=value=>`"${String(value).replaceAll('"','""')}"`;
  // Keep spreadsheet programs from treating text fields as formulas.
  const safe=value=>typeof value==='string'&&/^[=+@\-\t\r]/.test(value)?`'${value}`:value;
  return [headers.join(','),...items.map(item=>headers.map(key=>cell(safe(item[key]))).join(','))].join('\r\n');
}
