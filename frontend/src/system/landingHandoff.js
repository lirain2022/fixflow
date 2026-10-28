import {CATEGORY_LABELS,PRIORITY_LABELS} from '../tickets/constants';
const KEY='fixflow.landing-report.v1';
const MAX_AGE=60*60*1000;
function fields(value){
  if(!value||typeof value.description!=='string'||value.description.length>4000||!Object.hasOwn(CATEGORY_LABELS,value.category))throw new Error('請確認問題描述（最多 4000 字）與分類。');
  const result={description:value.description,category:value.category};
  for(const [key,max] of [['title',120],['location',200]])if(value[key]!==undefined){if(typeof value[key]!=='string'||value[key].length>max)throw new Error('標題或位置超過字數限制。');result[key]=value[key];}
  if(value.priority!==undefined){if(!Object.hasOwn(PRIORITY_LABELS,value.priority))throw new Error('請選擇有效的優先級。');result.priority=value.priority;}
  return result;
}
export function saveHandoff(description='',category='OTHER'){
  const data=fields(typeof description==='string'?{description:description.trim(),category}:description);
  try{sessionStorage.setItem(KEY,JSON.stringify({...data,savedAt:Date.now()}));}
  catch{throw new Error('瀏覽器無法暫存資料，請先複製內容，再使用會員登入建立工單。');}
  return '/member.html?next=report';
}
export function readHandoff(){
  try{
    const value=JSON.parse(sessionStorage.getItem(KEY));
    if(!value||typeof value.description!=='string'||value.description.length>4000||!Object.hasOwn(CATEGORY_LABELS,value.category)||!Number.isFinite(value.savedAt)||value.savedAt>Date.now()||Date.now()-value.savedAt>MAX_AGE){clearHandoff();return null;}
    return fields(value);
  }catch{return null;}
}
export function clearHandoff(){try{sessionStorage.removeItem(KEY);}catch{/* Storage may be blocked. */}}
