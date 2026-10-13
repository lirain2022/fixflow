import {useEffect,useState} from 'react';

export default function NotificationBell({api,onOpen,revision}){
  const [count,setCount]=useState(null),[error,setError]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();let pending=false;
    async function refresh(){
      if(pending||controller.signal.aborted)return;pending=true;
      try{const data=await api('/notifications/unread-count','GET',null,{signal:controller.signal});if(!controller.signal.aborted){setCount(data.unreadCount);setError(false);}}
      catch(e){if(e.name!=='AbortError'&&!controller.signal.aborted)setError(true);}finally{pending=false;}
    }
    const visible=()=>{if(document.visibilityState==='visible')refresh();};
    refresh();const timer=setInterval(visible,30000);document.addEventListener('visibilitychange',visible);
    return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[api,revision]);
  return <button className="button secondary notification-bell" onClick={onOpen} title={error?'通知暫時無法更新，請開啟通知中心重試':'開啟通知中心'} aria-label={error?'通知中心，暫時無法更新':count===null?'通知中心，讀取中':`通知中心，${count} 則未讀`}>通知{error?<span className="notification-count">!</span>:count>0?<span className="notification-count">{count>99?'99+':count}</span>:null}</button>;
}
