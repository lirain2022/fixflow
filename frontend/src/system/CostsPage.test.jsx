
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import CostsPage from './CostsPage';
const report={items:[{id:10,ticketId:1,ticketNo:'FIX-1',title:'冷氣維修',assetName:null,assigneeName:'小林',date:'2026-10-14T00:00:00Z',totalCost:125}],summary:{totalCost:125,laborCost:100,partsCost:25},total:1,totalPages:1};
it('shows totals and sends applied equipment filters to the report',async()=>{
 const api=vi.fn(async path=>path==='/costs/people'?[]:report);
 render(<CostsPage api={api} user={{id:1}}/>);
 expect(await screen.findByText('冷氣維修')).toBeVisible();
 expect(screen.getByLabelText('費用摘要')).toHaveTextContent('125');
 fireEvent.change(screen.getByLabelText('設備名稱或編號'),{target:{value:'冷氣'}});
 fireEvent.click(screen.getByRole('button',{name:'套用篩選'}));
 await waitFor(()=>expect(api.mock.calls.some(([path])=>path.includes('equipment=%E5%86%B7%E6%B0%A3'))).toBe(true));
 fireEvent.click(screen.getByRole('button',{name:'未登錄費用'}));
 await waitFor(()=>expect(api.mock.calls.some(([path])=>path.includes('mode=MISSING'))).toBe(true));
 expect(screen.getByText(/依工單建立日期/)).toBeVisible();
});
it('shows request failure with retry instead of stale totals',async()=>{
 const api=vi.fn(async path=>{if(path==='/costs/people')return [];throw Error('連線失敗');});
 render(<CostsPage api={api} user={{id:1}}/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('連線失敗');
 expect(screen.queryByLabelText('費用摘要')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'重試'}));
 await waitFor(()=>expect(api.mock.calls.filter(([path])=>path.startsWith('/costs?')).length).toBe(2));
});

it('clears the equipment filter when opening tickets without equipment',async()=>{
 const api=vi.fn(async path=>path==='/costs/people'?[]:report);render(<CostsPage api={api} user={{id:1}}/>);await screen.findByText('冷氣維修');
 fireEvent.change(screen.getByLabelText('設備名稱或編號'),{target:{value:'冷氣'}});fireEvent.click(screen.getByRole('button',{name:'套用篩選'}));fireEvent.click(screen.getByRole('button',{name:'未連結設備'}));
 await waitFor(()=>expect(api.mock.calls.some(([path])=>path.includes('mode=UNLINKED')&&path.includes('equipment=&'))).toBe(true));expect(screen.getByLabelText('設備名稱或編號')).toBeDisabled();
});

it('clears all filters from an empty list while keeping the selected queue',async()=>{
 const api=vi.fn(async path=>path==='/costs/people'?[]:{...report,items:[],total:0,totalPages:0});
 render(<CostsPage api={api} user={{id:1}}/>);await screen.findByText('目前沒有符合條件的資料');
 fireEvent.click(screen.getByRole('button',{name:'未登錄費用'}));fireEvent.change(screen.getByLabelText('設備名稱或編號'),{target:{value:'找不到'}});fireEvent.click(screen.getByRole('button',{name:'套用篩選'}));
 await screen.findByText('目前沒有符合條件的資料');fireEvent.click(screen.getByRole('button',{name:'清除篩選'}));
 await waitFor(()=>expect(api.mock.calls.some(([path])=>path.includes('from=&to=&equipment=&assigneeId=&mode=MISSING'))).toBe(true));
 expect(screen.getByLabelText('起始日期')).toHaveValue('');expect(screen.getByLabelText('設備名稱或編號')).toHaveValue('');
});
