import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {beforeEach,it,expect,vi} from 'vitest';
import RepairPage from './RepairPage';
import {readHandoff,saveHandoff} from '../system/landingHandoff';
beforeEach(()=>{sessionStorage.clear();window.history.replaceState(null,'','/repair.html?service=network');});
it('stores every report field before going to authenticated confirmation',async()=>{
 const go=vi.fn();render(<RepairPage onContinue={go}/>);
 expect(screen.getByLabelText('問題分類')).toHaveValue('NETWORK');
 fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'Wi-Fi 故障'}});
 fireEvent.change(screen.getByLabelText('問題描述'),{target:{value:'上午開始無法連線'}});
 fireEvent.change(screen.getByLabelText('報修位置'),{target:{value:'二樓辦公室'}});
 fireEvent.change(screen.getByLabelText('優先級'),{target:{value:'HIGH'}});
 fireEvent.click(screen.getByRole('button',{name:'下一步：確認報修'}));
 await waitFor(()=>expect(go).toHaveBeenCalledWith('/system.html?action=new'));
 expect(readHandoff()).toEqual({title:'Wi-Fi 故障',description:'上午開始無法連線',location:'二樓辦公室',category:'NETWORK',priority:'HIGH'});
});
it('restores a saved report without overwriting it with a different service link',()=>{
 saveHandoff({title:'冷氣故障',description:'不冷',location:'3F',category:'AIR_CONDITIONING',priority:'LOW'});
 render(<RepairPage/>);
 expect(screen.getByLabelText('問題標題')).toHaveValue('冷氣故障');
 expect(screen.getByLabelText('問題分類')).toHaveValue('AIR_CONDITIONING');
});

it('does not restore text that the user deliberately cleared',()=>{
 render(<RepairPage/>);
 fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:'暫存內容'}});
 fireEvent.change(screen.getByLabelText('問題標題'),{target:{value:''}});
 expect(readHandoff()?.title||'').toBe('');
});
