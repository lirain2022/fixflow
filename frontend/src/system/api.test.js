import { describe, it, expect, vi, afterEach } from 'vitest';
import { request } from './api';
afterEach(()=>vi.unstubAllGlobals());
describe('API transport',()=>{
  it('surfaces backend validation and never returns demo data',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({message:'請檢查欄位'}),{status:400,headers:{'Content-Type':'application/json'}})));
    await expect(request('/tickets','POST',{},'token')).rejects.toThrow('請檢查欄位');
  });
  it('marks expired sessions for the login screen',async()=>{
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:401})));
    await expect(request('/tickets','GET',null,'expired')).rejects.toMatchObject({status:401});
  });
});
