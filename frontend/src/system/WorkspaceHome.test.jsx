import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect,it,vi} from 'vitest';
import WorkspaceHome from './WorkspaceHome';
it('shows personal workload and links the overdue count to a filtered list',async()=>{
  const navigate=vi.fn();
  const api=async()=>({total:3,overdue:1,byStatus:{OPEN:0,ASSIGNED:2,IN_PROGRESS:1,RESOLVED:0,CLOSED:0,CANCELLED:0}});
  render(<WorkspaceHome user={{name:'王技師',role:'TECHNICIAN'}} api={api} onNavigate={navigate}/>);
  await screen.findByRole('button',{name:'逾期未完成 1'});
  await userEvent.click(screen.getByRole('button',{name:'逾期未完成 1'}));
  expect(navigate).toHaveBeenCalledWith('tickets',{overdue:true});
  expect(screen.queryByRole('button',{name:'前往派工中心'})).not.toBeInTheDocument();
});
it('offers retry when the summary cannot load',async()=>{
  render(<WorkspaceHome user={{name:'客戶',role:'CUSTOMER'}} api={async()=>{throw Error('無法連線');}} onNavigate={()=>{}}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('無法連線');
  expect(screen.getByRole('button',{name:'重新載入'})).toBeEnabled();
});
