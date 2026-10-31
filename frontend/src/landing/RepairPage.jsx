import MemberApp from '../member/MemberApp';
import {services} from './services';
import '../member/member.css';
export default function RepairPage(){
 const service=services.find(item=>item.id===new URLSearchParams(location.search).get('service'));
 return <MemberApp initialView="report" initialReportCategory={service?.category||'OTHER'}/>;
}
