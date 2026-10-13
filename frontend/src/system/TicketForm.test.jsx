import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {it,expect,vi} from 'vitest';
import TicketForm from './TicketForm';

it('starts a new report with equipment location and category without turning it into an edit',async()=>{
  localStorage.clear();const onDone=vi.fn();const asset={id:85,code:'AC-85',name:'冷氣',location:'3F',category:'AIR_CONDITIONING',enabled:true};
  const api=vi.fn(async(path,method,body)=>method==='POST'?{...body,id:99}:{items:[],total:0});
  render(<TicketForm initialAsset={asset} user={{id:83,role:'CUSTOMER'}} api={api} onDone={onDone} onClose={()=>{}}/>);
  expect(screen.getByLabelText('報修位置')).toHaveValue('3F');expect(screen.getByLabelText('問題分類')).toHaveValue('AIR_CONDITIONING');expect(screen.getByLabelText('報修設備')).toHaveValue('85');
  fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Leak'}});fireEvent.change(screen.getByLabelText('問題描述'),{target:{value:'Water leaking'}});
  fireEvent.click(screen.getByRole('button',{name:'送出報修'}));await waitFor(()=>expect(onDone).toHaveBeenCalled());
  expect(api).toHaveBeenCalledWith('/tickets','POST',expect.objectContaining({assetId:85,location:'3F',category:'AIR_CONDITIONING',version:null}));
});

it('keeps an existing new-ticket draft available when reporting another asset',async()=>{
  localStorage.clear();const baseline={title:'',description:'',location:'',category:'OTHER',priority:'MEDIUM',asset:null};
  localStorage.setItem('fixflow.ticket-draft.v1:84:new',JSON.stringify({baseline,fields:{...baseline,title:'Earlier report',location:'Old room'},version:null,savedAt:Date.now()}));
  const api=vi.fn(async()=>({items:[],total:0}));
  render(<TicketForm initialAsset={{id:85,code:'AC-85',name:'冷氣',location:'3F',category:'AIR_CONDITIONING',enabled:true}} user={{id:84,role:'CUSTOMER'}} api={api} onDone={()=>{}} onClose={()=>{}}/>);
  expect(screen.getByRole('button',{name:'送出報修'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:'恢復草稿'}));
  expect(screen.getByLabelText('問題標題')).toHaveValue('Earlier report');expect(screen.getByLabelText('報修位置')).toHaveValue('Old room');expect(screen.getByLabelText('報修設備')).toHaveValue('');
});

it('keeps conflicting input until reload is confirmed, then saves the latest version',async()=>{
  const ticket={id:1,version:2,title:'Original',description:'Problem',location:'Room',category:'OTHER',priority:'LOW',status:'OPEN',createdBy:{id:1}};
  const latest={...ticket,version:3,title:'Another editor saved'};let writes=0;const onDone=vi.fn();
  const api=vi.fn(async(path,method,body)=>{
    if(path.startsWith('/assets'))return {items:[],total:0};
    if(method==='PUT'){writes++;if(writes===1)throw Object.assign(new Error('工單已被更新'),{status:409});return {...latest,...body,version:4};}
    return latest;
  });
  const confirm=vi.spyOn(window,'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  try{
    render(<TicketForm ticket={ticket} user={{id:1,role:'CUSTOMER'}} api={api} onDone={onDone} onClose={()=>{}}/>);
    fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'My unsaved input'}});fireEvent.click(screen.getByRole('button',{name:'儲存變更'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('工單已被更新');expect(screen.getByLabelText('問題標題')).toHaveValue('My unsaved input');expect(screen.getByRole('button',{name:'儲存變更'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'重新載入最新工單'}));expect(screen.getByLabelText('問題標題')).toHaveValue('My unsaved input');
    fireEvent.click(screen.getByRole('button',{name:'重新載入最新工單'}));await waitFor(()=>expect(screen.getByLabelText('問題標題')).toHaveValue('Another editor saved'));
    fireEvent.click(screen.getByRole('button',{name:'儲存變更'}));await waitFor(()=>expect(onDone).toHaveBeenCalled());
    expect(api).toHaveBeenCalledWith('/tickets/1','PUT',expect.objectContaining({version:3,title:'Another editor saved'}));
  }finally{confirm.mockRestore();}
});

it('reloads closed status and prevents further edits',async()=>{
  const ticket={id:2,version:1,title:'Before assignment',description:'Problem',location:'Room',category:'OTHER',priority:'LOW',status:'OPEN',createdBy:{id:1}};
  const api=vi.fn(async(path,method)=>{
    if(path.startsWith('/assets'))return {items:[],total:0};
    if(method==='PUT')throw Object.assign(new Error('工單已被更新'),{status:409});
    return {...ticket,version:2,status:'CLOSED'};
  });
  const confirm=vi.spyOn(window,'confirm').mockReturnValue(true);
  try{
    render(<TicketForm ticket={ticket} user={{id:1,role:'CUSTOMER'}} api={api} onDone={()=>{}} onClose={()=>{}}/>);
    fireEvent.click(screen.getByRole('button',{name:'儲存變更'}));
    fireEvent.click(await screen.findByRole('button',{name:'重新載入最新工單'}));
    await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent('工單已結束'));
    expect(screen.getByRole('button',{name:'儲存變更'})).toBeDisabled();expect(screen.getByLabelText('問題標題')).toBeDisabled();
  }finally{confirm.mockRestore();}
});
