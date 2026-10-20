import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,expect,it,vi} from 'vitest';
import TicketForm from './TicketForm';
beforeEach(()=>localStorage.clear());
it('prefills a new report and sends it only after confirmation',async()=>{
 const api=vi.fn(async(path,method)=>method==='POST'?{id:1}:[]);
 render(<TicketForm user={{id:12}} initialValues={{description:'Wi-Fi 一直斷線',category:'NETWORK'}} api={api} onClose={()=>{}} onDone={()=>{}}/>);
 expect(screen.getByLabelText('問題描述')).toHaveValue('Wi-Fi 一直斷線');
 expect(screen.getByLabelText('問題分類')).toHaveValue('NETWORK');
 expect(api.mock.calls.some(c=>c[1]==='POST')).toBe(false);
 fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'網路故障'}});
 fireEvent.change(screen.getByLabelText('報修位置'),{target:{value:'辦公室'}});
 fireEvent.click(screen.getByRole('button',{name:'送出報修'}));
 await waitFor(()=>expect(api).toHaveBeenCalledWith('/tickets','POST',expect.objectContaining({description:'Wi-Fi 一直斷線',category:'NETWORK',title:'網路故障'})));
});
it('asks before restoring an existing account draft instead of overwriting it',()=>{
 const fields={title:'舊草稿',description:'尚未送出的維修',location:'3F',category:'OTHER',priority:'MEDIUM',asset:null};
 const key='fixflow.ticket-draft.v1:12:new';
 const previous=JSON.stringify({fields,baseline:{...fields,title:'',description:'',location:''},version:null,savedAt:Date.now()});
 localStorage.setItem(key,previous);
 render(<TicketForm user={{id:12}} initialValues={{description:'首頁的新報修',category:'NETWORK'}} api={async()=>[]} onClose={()=>{}} onDone={()=>{}}/>);
 expect(screen.getByRole('button',{name:'恢復草稿'})).toBeVisible();
 expect(localStorage.getItem(key)).toBe(previous);
 expect(screen.getByRole('button',{name:'送出報修'})).toBeDisabled();
 fireEvent.click(screen.getByRole('button',{name:'恢復草稿'}));
 expect(screen.getByLabelText('問題描述')).toHaveValue('尚未送出的維修');
});
