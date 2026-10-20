import {MonitorSmartphone,Wifi,AirVent,Cctv} from 'lucide-react';
export const services=[
 {id:'computer',title:'3C 裝置',description:'電腦、手機、平板與周邊設備',category:'EQUIPMENT',Icon:MonitorSmartphone,color:'blue'},
 {id:'network',title:'網路系統',description:'Wi-Fi、路由器與網路連線',category:'NETWORK',Icon:Wifi,color:'mint'},
 {id:'appliance',title:'居家家電',description:'冷氣、冰箱與生活家電',category:'OTHER',Icon:AirVent,color:'violet'},
 {id:'smart',title:'智慧設備',description:'監視器、門禁與智慧家庭',category:'EQUIPMENT',Icon:Cctv,color:'amber'},
];
export function ServiceGlyph({service,small=false}){
 const Icon=service.Icon;
 return <span className={`service-glyph glyph-${service.color} ${small?'glyph-small':''}`} aria-hidden="true"><span className="glyph-base"/><span className="glyph-middle"/><Icon className="glyph-icon" size={small?24:38}/><span className="glyph-dot"/></span>;
}
