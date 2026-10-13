import {money} from './repairMoney';
import {time} from './TicketDetail';

export default function AssetMaintenanceSummary({summary,user}){
  if(!summary)return null;
  return <section className="ticket-panel" aria-label="設備維修統計"><header className="panel-heading"><div><h2>設備維修統計</h2><p>{user.role==='ADMIN'?'統計此設備的所有關聯工單。':'僅統計你有權限查看的工單，不代表設備的全部費用。'}</p></div></header>
    <dl className="asset-cost-grid">
      <div><dt>報修次數</dt><dd>{summary.reportCount} 次</dd></div>
      <div><dt>累計人工費</dt><dd>{money(summary.laborCost)}</dd></div>
      <div><dt>累計零件費</dt><dd>{money(summary.partsCost)}</dd></div>
      <div><dt>已登錄總費用</dt><dd>{money(summary.totalCost)}</dd></div>
      <div><dt>最近維修完成</dt><dd>{summary.lastRepairAt?time(summary.lastRepairAt):'尚無維修紀錄'}</dd></div>
    </dl>
    <p className="report-hint">報修次數不含 {summary.cancelledCount} 張已取消工單；同一工單退回重修不重複計次。費用包含各次重修，已登錄 {summary.recordedRepairs} 次維修費用。</p>
    {summary.unpricedRepairs>0&&<p className="error-notice">{summary.unpricedRepairs} 次維修未登錄費用，未計入上述金額；未登錄不代表免費。</p>}
  </section>;
}
