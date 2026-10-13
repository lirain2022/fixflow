import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import RepairCompletionForm from './RepairCompletionForm';
import RepairHistory from './RepairHistory';

it('restores a saved draft and saves costs without completing the repair',async()=>{
 const save=vi.fn().mockResolvedValue(true),submit=vi.fn();
 render(<RepairCompletionForm busy={false} draft={{content:'',workHours:0,laborCost:250,parts:[{name:'Seal',quantity:2,unitPrice:10}]}} onSave={save} onSubmit={submit}/>);
 expect(screen.getByLabelText('人工費（NT$）')).toHaveValue(250);
 fireEvent.click(screen.getByRole('button',{name:'儲存費用草稿'}));
 await waitFor(()=>expect(save).toHaveBeenCalledWith({description:'',workHours:'0',laborCost:'250',parts:[{name:'Seal',quantity:2,unitPrice:'10'}]}));
 expect(submit).not.toHaveBeenCalled();
});

it('previews exact costs, submits raw line items and keeps inputs after failure',async()=>{
  const submit=vi.fn().mockResolvedValue(false);render(<RepairCompletionForm busy={false} onSubmit={submit}/>);
  fireEvent.change(screen.getByRole('textbox',{name:'維修紀錄',exact:true}),{target:{value:'Replaced connector'}});
  fireEvent.change(screen.getByLabelText('實際工時（小時）'),{target:{value:'1.50'}});fireEvent.change(screen.getByLabelText('人工費（NT$）'),{target:{value:'500.25'}});
  fireEvent.click(screen.getByRole('button',{name:'新增零件'}));fireEvent.change(screen.getByLabelText('零件 1 名稱'),{target:{value:'Connector'}});fireEvent.change(screen.getByLabelText('零件 1 數量'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('零件 1 單價（NT$）'),{target:{value:'12.30'}});
  expect(screen.getByLabelText('預估總費用')).toHaveTextContent('NT$ 524.85');fireEvent.click(screen.getByRole('button',{name:'提交維修完成'}));await waitFor(()=>expect(submit).toHaveBeenCalledWith({description:'Replaced connector',workHours:'1.50',laborCost:'500.25',parts:[{name:'Connector',quantity:2,unitPrice:'12.30'}]}));
  expect(screen.getByRole('textbox',{name:'維修紀錄',exact:true})).toHaveValue('Replaced connector');expect(screen.getByLabelText('零件 1 名稱')).toHaveValue('Connector');
  fireEvent.click(screen.getByRole('button',{name:'移除零件 1'}));expect(screen.getByLabelText('預估總費用')).toHaveTextContent('NT$ 500.25');
});
it('distinguishes unrecorded historical costs from explicitly free repairs',()=>{
  render(<RepairHistory repairs={[{id:1,author:'Old tech',content:'Legacy',totalCost:null},{id:2,author:'New tech',content:'Free adjustment',workHours:0.5,laborCost:0,partsCost:0,totalCost:0,parts:[]}]} summary={{recordedTotal:0,recordedRepairs:1,unpricedRepairs:1}}/>);
  expect(screen.getByText('未登錄費用')).toBeVisible();expect(screen.getByText(/另有 1 次維修未登錄費用/)).toBeVisible();expect(screen.getAllByText('NT$ 0.00').length).toBeGreaterThan(0);
});
