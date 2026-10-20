import {ArrowUpRight,ClipboardList,Coins,Package,ChevronDown} from 'lucide-react';

export const progressUrl='/system.html?view=tickets';
const questions=[
 ['報修前需要準備什麼？','準備設備名稱、故障狀況與設備所在位置。若知道故障發生時間、錯誤訊息或對使用造成的影響，也可以一起寫進描述。'],
 ['報修一定要先建立設備嗎？','不用。可以先以一般報修建立工單，再於系統中補上或關聯設備；報修時先把設備名稱與位置寫清楚即可。'],
 ['可以提供故障照片嗎？','可以。登入並送出報修後，開啟工單詳細資訊，就能上傳照片補充說明。'],
 ['費用在哪裡看？','登入後開啟對應工單的詳細資訊，查看已登錄的維修紀錄、人工費與零件費。尚未登錄費用不代表免費，實際內容請與處理人員確認。'],
 ['維修完成後，還有問題怎麼辦？','在待驗收階段先確認設備是否正常；若仍有問題，可在工單中提出重修並說明狀況。工單結案後仍可查閱維修紀錄。'],
];

export default function HomeSupport(){return <>
 <section className="home-progress" aria-labelledby="progress-title">
  <div className="progress-symbol" aria-hidden="true"><ClipboardList size={28}/></div>
  <div><p className="eyebrow">ALREADY REPORTED?</p><h2 id="progress-title">已經報修了？接著看進度。</h2><p>登入後直接查看你建立的工單，追蹤處理狀態、維修紀錄與已登錄費用。</p></div>
  <a className="primary" href={progressUrl}>查詢維修進度 <ArrowUpRight size={18}/></a>
 </section>
 <section className="section home-costs" id="fees" aria-labelledby="fees-title">
  <div className="sectionHead"><div><small>02 / REPAIR COSTS</small><h2 id="fees-title">維修做了什麼，<br/><strong>費用一起看清楚。</strong></h2></div><p>依工單中的實際維修紀錄查看明細。<br/>首頁不提供固定報價。</p></div>
  <div className="fee-grid">
   <article><Coins size={25} aria-hidden="true"/><h3>人工費</h3><p>查看處理人員登錄的維修人工費；實際工時可在維修紀錄中一併查閱。</p></article>
   <article><Package size={25} aria-hidden="true"/><h3>零件費</h3><p>更換零件時，可查看已登錄的品項、數量與單價，了解費用來源。</p></article>
   <article><ClipboardList size={25} aria-hidden="true"/><h3>工單費用明細</h3><p>從同一張工單查看各筆維修紀錄與費用，結案後仍保留查閱。</p></article>
  </div>
  <div className="fee-footnote"><p>尚未登錄費用不代表免費。是否有檢測費、報價及收費方式，請與處理人員確認。</p><a href={progressUrl}>查看我的工單費用 <ArrowUpRight size={16}/></a></div>
 </section>
 <section className="section home-faq" id="faq" aria-labelledby="faq-title">
  <div className="faq-intro"><small>03 / QUESTIONS</small><h2 id="faq-title">開始之前，<br/><strong>你可能想知道。</strong></h2><p>把報修、費用與驗收的疑問先弄清楚。</p><a href="/repair.html">準備好了，開始報修 <ArrowUpRight size={16}/></a></div>
  <div className="faq-list">{questions.map(([question,answer])=><details key={question}><summary>{question}<ChevronDown size={18} aria-hidden="true"/></summary><p>{answer}</p></details>)}</div>
 </section>
 </>;}
