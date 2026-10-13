import {it,expect} from 'vitest';
import {estimateRepair,cents} from './repairMoney';
it('calculates fractional prices and maximum inputs in integer cents',()=>{
  expect(estimateRepair('500.25',[{quantity:'2',unitPrice:'12.30'},{quantity:'3',unitPrice:'0.10'}])).toEqual({labor:50025,parts:2490,total:52515});
  expect(estimateRepair('9999999.99',Array.from({length:50},()=>({quantity:999,unitPrice:'999999.99'}))).total).toBe(4995999950049);
});
it('rejects malformed decimals, excessive values and fractional quantities in the preview',()=>{
  for(const value of ['','-1','0.001','Infinity','1e3','10000000'])expect(cents(value)).toBeNull();
  expect(estimateRepair('0',[{quantity:'1.5',unitPrice:'10'}])).toBeNull();expect(estimateRepair('0',[{quantity:'0',unitPrice:'10'}])).toBeNull();
});
