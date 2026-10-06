export const suppliers=[
  {id:'walmart',name:'Walmart',initial:'W',note:'Evansville grocery delivery',url:'https://www.walmart.com/store/1341-evansville-in/shopping-services',search:'https://www.walmart.com/search?q=',source:'Walmart Evansville delivery',color:'#287ec3'},
  {id:'sams',name:'Sam’s Club',initial:'S',note:'Bulk packs · membership may apply',url:'https://www.samsclub.com/club/8123/grocery',search:'https://www.samsclub.com/s/',source:'Sam’s Club Evansville grocery',color:'#326ea3'},
  {id:'gordon',name:'Gordon Food Service',initial:'G',note:'Restaurant and market supplies',url:'https://www.gfsstore.com/locations/evansville/',search:null,source:'Gordon Evansville store',color:'#9a3438'}
];
export function compareQuotes(quotes,quantity,sort='price'){
  if(!Number.isInteger(quantity)||quantity<1)throw Error('Choose a whole quantity of at least 1.');
  return quotes.filter(quote=>quote.confirmed&&Number.isFinite(quote.price)&&quote.price>=0&&Number.isFinite(quote.fee)&&quote.fee>=0&&Number.isFinite(quote.hours)&&quote.hours>=0&&Number.isInteger(quote.minimum)&&quote.minimum>=1).map(quote=>{
    const purchaseQuantity=Math.max(quantity,quote.minimum);
    const total=purchaseQuantity*quote.price+quote.fee;
    return {...quote,purchaseQuantity,total,effectiveUnitPrice:total/purchaseQuantity};
  }).sort((a,b)=>sort==='time'?a.hours-b.hours||a.total-b.total:a.total-b.total||a.hours-b.hours);
}
