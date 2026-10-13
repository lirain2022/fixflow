import {useEffect,useState} from 'react';

export default function AssetPicker({api,selected,onSelect,disabled,linking=false}){
  const [query,setQuery]=useState(''),[result,setResult]=useState({items:[],total:0}),[error,setError]=useState(''),[loading,setLoading]=useState(true),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    const timer=setTimeout(()=>{
      const params=new URLSearchParams({query,enabledOnly:'true',size:'30'});
      api(`/assets?${params}`,'GET',null,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setResult(data);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[api,query,revision]);
  const options=selected&&!result.items.some(a=>a.id===selected.id)?[selected,...result.items]:result.items;
  return <fieldset className="asset-picker" disabled={disabled}><legend>{linking?'選擇要連結的設備':'關聯設備（選填）'}</legend>
    <label className="field">搜尋設備<input value={query} maxLength={200} onChange={e=>setQuery(e.target.value)} placeholder="設備編號、名稱或位置"/></label>
    <label className="field">報修設備<select aria-label="報修設備" name="assetId" value={selected?.id||''} onChange={e=>onSelect(options.find(a=>String(a.id)===e.target.value)||null)}><option value="">{linking?'請選擇設備':'不指定設備／一般報修'}</option>{options.map(a=><option key={a.id} value={a.id}>{a.code} · {a.name}{a.enabled?'':'（已停用）'}</option>)}</select></label>
    {loading&&<p className="muted" role="status">搜尋設備中…</p>}{error&&<p role="alert" className="error-notice">{error} <button type="button" className="text-button" onClick={()=>setRevision(n=>n+1)}>重試設備查詢</button></p>}
    {!loading&&!error&&<p className="muted">{result.total>30?'符合超過 30 筆，請輸入更精確的關鍵字。':result.total===0?(linking?'沒有符合條件的設備，可新增設備再連結。':'沒有符合條件的啟用設備，仍可送出一般報修。'):(linking?'連結後保留原工單的狀態、位置與費用。':'選擇設備會帶入位置與分類，仍可自行調整。')}</p>}
  </fieldset>;
}
