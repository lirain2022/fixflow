import {render,screen,fireEvent} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import AssetsPage from './AssetsPage';

it('separates equipment search from unlinked costs and preserves the equipment query',async()=>{
 const api=async()=>({items:[],total:0,totalPages:0});
 render(<AssetsPage api={api} user={{id:1,role:'CUSTOMER'}}/>);
 const query=screen.getByLabelText('搜尋設備資料');fireEvent.change(query,{target:{value:'AC-3F'}});
 expect(screen.queryByLabelText('搜尋未連結工單')).not.toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'未連結工單與費用',exact:true}));
 expect(screen.getByLabelText('搜尋未連結工單')).toBeVisible();expect(query).not.toBeVisible();
 fireEvent.click(screen.getByRole('button',{name:'設備列表',exact:true}));expect(query).toBeVisible();expect(query).toHaveValue('AC-3F');
});

it('lets a reporter start from an equipment card without opening history',async()=>{
  localStorage.clear();const asset={id:5,code:'A-5',name:'Pump',location:'B1',category:'OTHER',enabled:true,status:'ACTIVE'};
  const api=async()=>({items:[asset],total:1,totalPages:1});
  render(<AssetsPage api={api} user={{id:73,role:'CUSTOMER'}}/>);
  fireEvent.click(await screen.findByRole('button',{name:'此設備報修'}));
  expect(screen.getByLabelText('報修位置')).toHaveValue('B1');expect(screen.getByLabelText('報修設備')).toHaveValue('5');
});

it('shows scoped equipment totals and opens a prefilled report',async()=>{
  localStorage.clear();const asset={id:5,code:'A-5',name:'Pump',location:'B1',category:'OTHER',enabled:true,status:'ACTIVE'};
  const api=vi.fn(async path=>path.includes('/tickets')?{items:[],total:0,totalPages:0,maintenanceSummary:{reportCount:2,cancelledCount:1,laborCost:10.10,partsCost:0.30,totalCost:10.40,recordedRepairs:1,unpricedRepairs:1,lastRepairAt:'2026-10-01T00:00:00Z'}}:path==='/assets/5'?asset:{items:[asset],total:1,totalPages:1});
  render(<AssetsPage api={api} user={{id:73,role:'CUSTOMER'}}/>);
  fireEvent.click(await screen.findByRole('button',{name:'維修紀錄'}));
  expect(await screen.findByLabelText('設備維修統計')).toHaveTextContent('NT$ 10.40');
  expect(screen.getByLabelText('設備維修統計')).toHaveTextContent('1 次維修未登錄費用');
  fireEvent.click(screen.getByRole('button',{name:'此設備報修'}));
  expect(screen.getByLabelText('報修位置')).toHaveValue('B1');expect(screen.getByLabelText('報修設備')).toHaveValue('5');
});

it('does not offer reporting for technicians or retired equipment',async()=>{
  const asset={id:5,code:'A-5',name:'Pump',location:'B1',category:'OTHER',enabled:false,status:'RETIRED'};
  const api=vi.fn(async path=>path.includes('/tickets')?{items:[],total:0,totalPages:0,maintenanceSummary:{reportCount:0,cancelledCount:0,laborCost:0,partsCost:0,totalCost:0,recordedRepairs:0,unpricedRepairs:0,lastRepairAt:null}}:path==='/assets/5'?asset:{items:[asset],total:1,totalPages:1});
  render(<AssetsPage api={api} user={{id:73,role:'TECHNICIAN'}}/>);fireEvent.click(await screen.findByRole('button',{name:'維修紀錄'}));
  expect(await screen.findByLabelText('設備維修統計')).toHaveTextContent('尚無維修紀錄');expect(screen.queryByRole('button',{name:'此設備報修'})).not.toBeInTheDocument();
});
