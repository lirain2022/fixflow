import React,{lazy,Suspense,useEffect,useRef,useState} from 'react';
import {Sparkles,Pause,Play} from 'lucide-react';
const Scene=lazy(()=>import('./Scene'));
function StaticCore(){return <div className="static-core" aria-hidden="true"><span/><span/><span/><strong>RE:<b>FIX</b></strong></div>;}
class Boundary extends React.Component{
 state={failed:false};static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<><StaticCore/><p className="scene-unavailable">目前裝置使用靜態展示</p></>:this.props.children;}
}
export default function MotionScene(){
 const container=useRef(null);
 const [reduced,setReduced]=useState(()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false);
 const [paused,setPaused]=useState(false),[visible,setVisible]=useState(true),[foreground,setForeground]=useState(!document.hidden),[pulse,setPulse]=useState(0);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const changed=()=>setReduced(media.matches);media.addEventListener('change',changed);const visibility=()=>setForeground(!document.hidden);document.addEventListener('visibilitychange',visibility);return()=>{media.removeEventListener('change',changed);document.removeEventListener('visibilitychange',visibility);};},[]);
 useEffect(()=>{if(!window.IntersectionObserver)return;const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting));observer.observe(container.current);return()=>observer.disconnect();},[]);
 const animated=!reduced&&!paused&&visible&&foreground;
 return <div className="hero-art" ref={container}>
  <div className="scene-coordinate">REPAIR CORE <span>01 / INTERACTIVE</span></div>
  <div className="scene-stage" aria-hidden="true" onClick={()=>setPulse(n=>n+1)}><Boundary>{animated?<Suspense fallback={<StaticCore/>}><Scene pulse={pulse}/></Suspense>:<StaticCore/>}</Boundary></div>
  <div className="scene-controls">{!reduced&&<><button onClick={()=>setPulse(n=>n+1)} disabled={paused}><Sparkles size={15}/>點亮維修核心</button><button onClick={()=>setPaused(!paused)} aria-pressed={paused}>{paused?<Play size={14}/>:<Pause size={14}/>} {paused?'播放 3D':'暫停 3D'}</button></>}{reduced&&<span>已依照你的偏好減少動態效果</span>}</div>
  <p className="scene-caption">移動滑鼠探索 · 拖曳旋轉 · 點擊發出光波</p>
 </div>;
}
