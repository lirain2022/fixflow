import {expect} from '@playwright/test';
// Provision real ADMIN test accounts through the protected API. Registration stays
// member-only in production; these fixtures exercise internal management screens.
export async function registerStaff(request,{data}) {
 const login=await request.post('/api/auth/admin-login',{data:{email:'admin@fixflow.local',password:'FixFlow123!'}});expect(login.status()).toBe(200);
 const admin=await login.json();
 const created=await request.post('/api/users',{headers:{Authorization:'Bearer '+admin.token},data:{...data,role:'ADMIN'}});expect(created.status()).toBe(201);
 const session=await request.post('/api/auth/admin-login',{data:{email:data.email,password:data.password}});expect(session.status()).toBe(200);
 const body=await session.json();return {status:()=>created.status(),json:async()=>body};
}
