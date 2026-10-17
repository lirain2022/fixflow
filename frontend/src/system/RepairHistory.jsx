import {money} from './repairMoney';
const time=value=>value?new Date(value).toLocaleString('zh-TW',{hour12:false}):'—';

export default function RepairHistory({repairs,summary,onCorrect}){
  return <section className="detail-section repair-history"><h4>維修紀錄與費用</h4>
    {summary?.recordedRepairs>0&&<div className="repair-summary"><span>已登錄累計費用</span><strong>{money(summary.recordedTotal)}</strong><small>共 {summary.recordedRepairs} 次，包含退回前的維修紀錄。</small></div>}
    {summary?.unpricedRepairs>0&&<p className="muted">另有 {summary.unpricedRepairs} 次維修未登錄費用，未計入合計。</p>}
    {repairs.length===0?<div><p className="muted">尚未提交維修紀錄。</p>{onCorrect&&<button className="button secondary" onClick={()=>onCorrect({})}>補登費用</button>}</div>:repairs.map(entry=><article className="timeline-entry repair-entry" key={entry.id}><strong>{entry.author}</strong><p>{entry.content}</p><small>{time(entry.startedAt)} → {time(entry.completedAt)}</small>
      {entry.totalCost==null?<p className="muted">未登錄費用</p>:<><dl className="repair-cost-grid"><div><dt>實際工時</dt><dd>{entry.workHours} 小時</dd></div><div><dt>人工費</dt><dd>{money(entry.laborCost)}</dd></div><div><dt>零件費</dt><dd>{money(entry.partsCost)}</dd></div><div><dt>本次合計</dt><dd>{money(entry.totalCost)}</dd></div></dl>
      {entry.parts?.length>0?<ul className="repair-parts-list">{entry.parts.map((part,index)=><li key={index}><strong>{part.name}</strong><span>{part.quantity} × {money(part.unitPrice)}</span><span>小計 {money(part.lineTotal)}</span></li>)}</ul>:<p className="muted">本次未使用零件。</p>}</>}
      {entry.totalCost!=null&&Number(entry.totalCost)===0&&<p className="muted">免費維修（已登錄 0 元）</p>}{onCorrect&&<button className="button secondary" onClick={()=>onCorrect(entry)}>{entry.totalCost==null?'補登費用':'更正費用'}</button>}
    </article>)}
  </section>;
}
