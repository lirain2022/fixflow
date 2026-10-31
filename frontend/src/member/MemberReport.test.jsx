import {render,screen,fireEvent,waitFor,cleanup,within,act} from '@testing-library/react';
import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import MemberReport from './MemberReport';
import {readHandoff,saveHandoff} from '../system/landingHandoff';
beforeEach(()=>sessionStorage.clear());afterEach(()=>{cleanup();vi.restoreAllMocks();});
function fill(){fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'筆電故障'}});fireEvent.change(screen.getByLabelText('問題描述'),{target:{value:'無法開機'}});fireEvent.change(screen.getByLabelText('報修位置'),{target:{value:'2F'}});}
function addPart(){fireEvent.click(screen.getByRole('button',{name:'加入零件需求'}));const group=screen.getByRole('group',{name:'零件需求 1'});fireEvent.change(within(group).getByLabelText('零件名稱'),{target:{value:'SSD'}});fireEvent.change(within(group).getByLabelText('用途與規格'),{target:{value:'升級容量'}});return group;}
it('sends repair and optional parts in one request and prevents duplicate clicks',async()=>{
 let resolve;const api=vi.fn(()=>new Promise(r=>{resolve=r;})),done=vi.fn();render(<MemberReport api={api} onDone={done}/>);fill();addPart();
 const submit=screen.getByRole('button',{name:'送出報修',exact:true});fireEvent.submit(submit.closest('form'));fireEvent.submit(submit.closest('form'));
 expect(api).toHaveBeenCalledTimes(1);expect(api.mock.calls[0]).toEqual(['/member/tickets','POST',{title:'筆電故障',description:'無法開機',location:'2F',category:'OTHER',priority:'MEDIUM',partRequests:[{name:'SSD',quantity:1,purpose:'升級容量',referenceUrl:''}]}]);
 await act(async()=>resolve({id:42}));expect(done).toHaveBeenCalledWith({id:42});expect(readHandoff()).toBeNull();
});
it('keeps the complete editable draft after validation fails and restores it on reload',async()=>{
 const api=vi.fn().mockRejectedValue(Object.assign(new Error('請確認零件規格'),{status:400}));let view=render(<MemberReport api={api} onDone={()=>{}}/>);fill();addPart();
 fireEvent.click(screen.getByRole('button',{name:'送出報修',exact:true}));await screen.findByText('請確認零件規格');
 expect(screen.getByRole('button',{name:'送出報修',exact:true})).toBeEnabled();view.unmount();
 render(<MemberReport api={api} onDone={()=>{}}/>);expect(screen.getByLabelText('問題標題')).toHaveValue('筆電故障');expect(screen.getByLabelText('零件名稱')).toHaveValue('SSD');
 fireEvent.click(screen.getByRole('button',{name:'移除零件需求 1'}));expect(screen.queryByLabelText('零件名稱')).not.toBeInTheDocument();expect(readHandoff().partRequests).toEqual([]);
});
it('unknown submission results remain blocked after reload and offer checking existing reports',async()=>{
 const api=vi.fn().mockRejectedValue(new Error('連線中斷')),review=vi.fn();let view=render(<MemberReport api={api} onDone={()=>{}} onReview={review}/>);fill();
 fireEvent.click(screen.getByRole('button',{name:'送出報修',exact:true}));await screen.findByText('連線中斷');view.unmount();
 render(<MemberReport api={api} onDone={()=>{}} onReview={review}/>);
 expect(screen.getByRole('button',{name:'送出報修',exact:true})).toBeDisabled();expect(screen.getByLabelText('問題標題')).toHaveValue('筆電故障');
 fireEvent.click(screen.getByRole('button',{name:'查看我的報修'}));expect(review).toHaveBeenCalledTimes(1);expect(api).toHaveBeenCalledTimes(1);
});
it('preselects service category but an existing draft takes precedence',()=>{
 saveHandoff({title:'舊草稿',description:'故障',location:'3F',category:'AIR_CONDITIONING',priority:'LOW',partRequests:[{name:'濾網',quantity:1,purpose:'更換',referenceUrl:''}]});
 render(<MemberReport api={vi.fn()} initialCategory="NETWORK"/>);expect(screen.getByLabelText('問題分類')).toHaveValue('AIR_CONDITIONING');expect(screen.getByLabelText('零件名稱')).toHaveValue('濾網');
});
it('resumes all preserved input after the member checks that no report was created',async()=>{
 saveHandoff({title:'筆電故障',description:'無法開機',location:'2F',category:'OTHER',priority:'MEDIUM',partRequests:[{name:'SSD',quantity:1,purpose:'升級容量',referenceUrl:''}],submissionState:'uncertain'});
 const api=vi.fn().mockResolvedValue({id:42}),done=vi.fn(),review=vi.fn();
 let view=render(<MemberReport api={api} onDone={done} onReview={review}/>);
 expect(screen.queryByRole('button',{name:'確認未建立，繼續編輯'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'查看我的報修'}));expect(review).toHaveBeenCalledTimes(1);view.unmount();
 render(<MemberReport api={api} onDone={done} onReview={review}/>);vi.spyOn(window,'confirm').mockReturnValue(true);
 fireEvent.click(screen.getByRole('button',{name:'確認未建立，繼續編輯'}));
 expect(screen.getByLabelText('問題標題')).toHaveValue('筆電故障');expect(screen.getByLabelText('零件名稱')).toHaveValue('SSD');
 expect(screen.getByRole('button',{name:'送出報修',exact:true})).toBeEnabled();expect(api).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'送出報修',exact:true}));await waitFor(()=>expect(done).toHaveBeenCalledWith({id:42}));expect(api).toHaveBeenCalledTimes(1);
});
