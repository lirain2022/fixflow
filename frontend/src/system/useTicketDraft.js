import {useEffect,useRef,useState} from 'react';
import {CATEGORY_LABELS,PRIORITY_LABELS} from '../tickets/constants';

const PREFIX='fixflow.ticket-draft.v1:';
const MAX_AGE=7*24*60*60*1000;
const STORAGE_ERROR='無法暫存草稿，請先複製內容或直接儲存工單。';
const TAB_CONFLICT='另一個分頁已更新草稿，本分頁暫停暫存。請先複製目前內容或儲存工單。';
function fields(ticket){return {title:ticket?.title||'',description:ticket?.description||'',location:ticket?.location||'',category:ticket?.category||'OTHER',priority:ticket?.priority||'MEDIUM',asset:ticket?.asset||null};}
function same(a,b){return a.title===b.title&&a.description===b.description&&a.location===b.location&&a.category===b.category&&a.priority===b.priority&&(a.asset?.id??null)===(b.asset?.id??null);}
function validFields(value){return value&&typeof value.title==='string'&&value.title.length<=120&&typeof value.description==='string'&&value.description.length<=4000&&typeof value.location==='string'&&value.location.length<=200&&Object.hasOwn(CATEGORY_LABELS,value.category)&&Object.hasOwn(PRIORITY_LABELS,value.priority)&&(value.asset===null||(Number.isSafeInteger(value.asset?.id)&&value.asset.id>0));}
function load(key){
  if(!key)return {raw:null,record:null,error:STORAGE_ERROR};
  try{
    const raw=localStorage.getItem(key);if(!raw)return {raw:null,record:null,error:''};
    let record;try{record=JSON.parse(raw);}catch{/* Ignore malformed drafts. */}
    if(!record||!Number.isFinite(record.savedAt)||record.savedAt>Date.now()||Date.now()-record.savedAt>MAX_AGE||!validFields(record.fields)||!validFields(record.baseline)||!(record.version===null||(Number.isSafeInteger(record.version)&&record.version>=0))){localStorage.removeItem(key);return {raw:null,record:null,error:''};}
    return {raw,record,error:''};
  }catch{return {raw:null,record:null,error:STORAGE_ERROR};}
}

export default function useTicketDraft(ticket,user,initialAsset,initialValues){
  const key=user?.id?`${PREFIX}${user.id}:${ticket?.id??'new'}`:null;
  const [initial]=useState(()=>load(key));
  const seed=ticket|| (initialAsset?{asset:initialAsset,location:initialAsset.location,category:initialAsset.category}:initialValues);
  const [draft,setDraft]=useState(()=>fields(seed)),[baseline,setBaseline]=useState(()=>fields(!ticket&&initialValues?null:seed));
  const [version,setVersion]=useState(ticket?.version??null),[pending,setPending]=useState(initial.record);
  const [notice,setNotice]=useState(initial.error),[savedAt,setSavedAt]=useState(null);
  const raw=useRef(initial.raw),paused=useRef(false);
  const dirty=!same(draft,baseline);
  // Do not overwrite a draft updated by another open tab since this form loaded it.
  function persist(record){
    if(!key){setNotice(STORAGE_ERROR);return false;}
    try{
      if(localStorage.getItem(key)!==raw.current){paused.current=true;setNotice(TAB_CONFLICT);setSavedAt(null);return false;}
      const next=record?JSON.stringify(record):null;
      if(next===null)localStorage.removeItem(key);else localStorage.setItem(key,next);
      raw.current=next;setNotice('');setSavedAt(record?.savedAt??null);return true;
    }catch{setNotice(STORAGE_ERROR);return false;}
  }
  useEffect(()=>{
    if(pending||paused.current)return;
    if(dirty)persist({fields:draft,baseline,version,savedAt:Date.now()});
    else if(raw.current)persist(null);
  },[draft,baseline,version,pending,dirty]);
  useEffect(()=>{
    if(!key)return;
    const changed=event=>{
      if(event.storageArea===localStorage&&(event.key===key||event.key===null)&&event.newValue!==raw.current){paused.current=true;setNotice(TAB_CONFLICT);setSavedAt(null);}
    };
    window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed);
  },[key]);
  useEffect(()=>{
    if(!dirty)return;
    const warn=event=>{event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
  },[dirty]);
  function restore(){
    if(!pending)return false;
    const stale=(ticket?.version??null)!==pending.version;
    setDraft(pending.fields);setBaseline(pending.baseline);setVersion(pending.version);setPending(null);return stale;
  }
  function discard(){persist(null);setPending(null);}
  function clear(){paused.current=true;persist(null);}
  function reset(latest){
    clear();setPending(null);setDraft(fields(latest));setBaseline(fields(latest));setVersion(latest?.version??null);
    paused.current=raw.current!==null;
  }
  return {draft,setDraft,version,dirty,pending,notice,savedAt,restore,discard,clear,reset};
}
