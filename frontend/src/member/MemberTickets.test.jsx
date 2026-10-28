import {useState} from 'react';
import {render,screen,fireEvent,act,cleanup} from '@testing-library/react';
import {it,expect,vi,afterEach} from 'vitest';
import MemberTickets from './MemberTickets';
afterEach(cleanup);
function List({api}){const [filters,setFilters]=useState({page:0,status:'',query:'',search:''});return <MemberTickets api={api} onOpen={()=>{}} filters={filters} onFiltersChange={setFilters}/>;}
const row=(title,status='OPEN')=>({id:1,ticketNo:'FIX-1',title,status,location:'Room'});
it('ignores a late old response after a new filter has completed',async()=>{
 let resolveOld;
 const api=vi.fn(path=>path.includes('status=CLOSED')?Promise.resolve({items:[row('新結果','CLOSED')],total:1,totalPages:1}):new Promise(resolve=>{resolveOld=resolve;}));
 render(<List api={api}/>);
 fireEvent.change(screen.getByRole('combobox',{name:'工單狀態'}),{target:{value:'CLOSED'}});
 await screen.findByRole('button',{name:/新結果/});
 await act(async()=>resolveOld({items:[row('舊結果')],total:1,totalPages:1}));
 expect(screen.getByRole('button',{name:/新結果/})).toBeInTheDocument();expect(screen.queryByRole('button',{name:/舊結果/})).not.toBeInTheDocument();
});
it('returns to an available page when the last matching item disappears',async()=>{
 const api=async path=>({items:[row('原結果')],total:11,totalPages:2});
 const {rerender}=render(<List api={api}/>);await screen.findByRole('button',{name:/原結果/});
 fireEvent.click(screen.getByRole('button',{name:'下一頁'}));await screen.findByText(/第 2 頁/);
 const refreshed=async path=>({items:path.includes('page=1')?[]:[row('保留結果')],total:10,totalPages:1});
 rerender(<List api={refreshed}/>);
 await screen.findByRole('button',{name:/保留結果/});expect(screen.getByText(/第 1 頁/)).toBeInTheDocument();
});
