import {beforeEach,expect,it,vi} from 'vitest';
import {saveHandoff,readHandoff,clearHandoff} from './landingHandoff';
beforeEach(()=>{sessionStorage.clear();vi.restoreAllMocks();});
it('preserves the full public report through login and excludes extra properties',()=>{
 const fields={title:'網路故障',description:'Wi-Fi 斷線',location:'2F',category:'NETWORK',priority:'HIGH'};
 expect(saveHandoff({...fields,id:999,role:'ADMIN'})).toBe('/system.html?action=new');
 expect(readHandoff()).toEqual(fields);
});
it('rejects oversized public form fields and invalid priorities',()=>{
 expect(()=>saveHandoff({title:'x'.repeat(121),description:'故障',category:'OTHER',location:'1F',priority:'LOW'})).toThrow();
 expect(()=>saveHandoff({title:'故障',description:'故障',category:'OTHER',location:'1F',priority:'INVALID'})).toThrow();
});
it('keeps report text across navigation without placing it in a URL',()=>{
 const url=saveHandoff(' Wi-Fi 一直斷線 ','NETWORK');
 expect(url).toBe('/system.html?action=new');
 expect(readHandoff()).toEqual({description:'Wi-Fi 一直斷線',category:'NETWORK'});
 expect(readHandoff()).not.toBeNull();
 clearHandoff();expect(readHandoff()).toBeNull();
});
it('expires anonymous report text after one hour',()=>{
 saveHandoff('冷氣不冷','AIR_CONDITIONING');vi.spyOn(Date,'now').mockReturnValue(Date.now()+3600001);
 expect(readHandoff()).toBeNull();
});
it('rejects invalid input and surfaces blocked storage',()=>{
 expect(()=>saveHandoff('x'.repeat(4001),'OTHER')).toThrow();
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('blocked');});
 expect(()=>saveHandoff('問題','OTHER')).toThrow();
});
