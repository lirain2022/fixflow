export async function request(path,method='GET',body=null,token=null,{signal,blob=false}={}) {
  const headers={};if(token)headers.Authorization=`Bearer ${token}`;
  const multipart=body instanceof FormData;
  if(body!==null&&!multipart)headers['Content-Type']='application/json';
  let response;
  try{response=await fetch(`/api${path}`,{method,headers,signal,body:body===null?undefined:multipart?body:JSON.stringify(body)});}
  catch(error){if(error.name==='AbortError')throw error;throw new Error('無法連線至後端，請確認後端已啟動。');}
  if(!response.ok){
    let data;try{data=await response.json();}catch{data={};}
    const error=new Error(data.message||(response.status===401?'登入已過期，請重新登入。':`操作失敗 (${response.status})，請稍後再試。`));error.status=response.status;throw error;
  }
  return blob?response.blob():response.status===204?null:response.json();
}
const SESSION_KEY='fixflow.session.v1';
export function readSession(){try{return JSON.parse(sessionStorage.getItem(SESSION_KEY))?.token||null;}catch{return null;}}
export function saveSession(token){try{token?sessionStorage.setItem(SESSION_KEY,JSON.stringify({token})):sessionStorage.removeItem(SESSION_KEY);}catch{/* Continue in memory if browser storage is unavailable. */}}
