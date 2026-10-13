export function cents(value,max=9999999.99){
  const text=String(value);if(!/^\d+(\.\d{1,2})?$/.test(text)||Number(text)>max)return null;
  const [whole,fraction='']=text.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
export function estimateRepair(laborCost,parts){
  const labor=cents(laborCost);if(labor===null)return null;
  let total=0;
  for(const part of parts){const price=cents(part.unitPrice,999999.99),quantity=Number(part.quantity);if(price===null||!Number.isInteger(quantity)||quantity<1||quantity>999)return null;total+=price*quantity;}
  return {labor,parts:total,total:labor+total};
}
export const money=value=>`NT$ ${Number(value).toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
