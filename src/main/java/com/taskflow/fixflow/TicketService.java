package com.taskflow.fixflow;

import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.*;
import com.taskflow.entity.TicketStatus;

@Service @Transactional
public class TicketService {
    private final TicketRepository tickets;private final UserRepository users;private final EntryRepository entries;private final AttachmentRepository attachments;private final AssetRepository assets;
    private final NotificationService notifications;private final RepairQuoteRepository quotes;
    public TicketService(TicketRepository tickets,UserRepository users,EntryRepository entries,AttachmentRepository attachments,AssetRepository assets,NotificationService notifications,RepairQuoteRepository quotes){this.tickets=tickets;this.users=users;this.entries=entries;this.attachments=attachments;this.assets=assets;this.notifications=notifications;this.quotes=quotes;}
    public boolean visible(Ticket t,User actor){return actor.role==Role.ADMIN||t.createdBy.getId().equals(actor.id)||(t.assignedTo!=null&&t.assignedTo.getId().equals(actor.id));}
    public Ticket find(Long id,User actor,boolean lock){Ticket t=(lock?tickets.lockById(id):tickets.findById(id)).orElseThrow(ApiException::missing);if(!visible(t,actor))throw ApiException.missing();return t;}
    public void active(Ticket t){if(t.status==TicketStatus.CLOSED||t.status==TicketStatus.CANCELLED)throw new ApiException(409,"工單已結束，不能再修改");}
    public void log(Ticket t,User actor,String text){entry(t,actor,"ACTIVITY",text);t.updatedAt=Instant.now();}
    private TicketEntry entry(Ticket t,User actor,String kind,String text){TicketEntry e=new TicketEntry();e.ticket=t;e.author=actor;e.kind=kind;e.content=text.strip();return entries.save(e);}
    public Map<String,Object> list(User actor,String query,TicketStatus status,int page,int size,boolean overdue,Priority priority,Long assigneeId,TicketOrder order,TicketScope scope){
        if(page<0||size<1||size>100)throw new ApiException(400,"分頁條件不正確");
        var spec=order.apply(TicketFilters.matching(actor,query,status,overdue,priority,assigneeId).and(TicketFilters.scope(actor,scope)));
        var result=tickets.findAll(spec,PageRequest.of(page,size));
        return Map.of("items",result.getContent().stream().map(this::view).toList(),"total",result.getTotalElements(),"page",page,"totalPages",result.getTotalPages());
    }
    @Transactional(readOnly=true)
    public byte[] export(User actor,String query,TicketStatus status,boolean overdue,Priority priority,Long assigneeId,TicketOrder order,TicketScope scope){
        var spec=order.apply(TicketFilters.matching(actor,query,status,overdue,priority,assigneeId).and(TicketFilters.scope(actor,scope)));
        var result=tickets.findAll(spec,PageRequest.of(0,5001));
        if(result.getTotalElements()>5000)throw new ApiException(400,"匯出最多 5,000 筆，請縮小篩選範圍後重試");
        return TicketCsv.encode(result.getContent());
    }
    public Map<String,Object> create(User actor,Requests.TicketInput input){

        Ticket t=new Ticket();t.createdBy=actor;t.asset=assetFor(input.assetId());apply(t,input);tickets.saveAndFlush(t);
        t.ticketNo="FIX-"+ZonedDateTime.now(ZoneOffset.UTC).getYear()+"-"+String.format("%06d",t.id);log(t,actor,"建立工單");notifications.publish(t,actor,"CREATED","新報修工單，請安排派工");return detail(t);
    }
    private void apply(Ticket t,Requests.TicketInput input){t.title=input.title().strip();t.description=input.description().strip();t.location=input.location().strip();t.category=input.category();t.priority=input.priority();t.dueAt=t.createdAt.plusSeconds(input.priority().hours*3600L);}
    private Asset assetFor(Long id){return id==null?null:assets.lockById(id).filter(a->a.enabled).orElseThrow(()->new ApiException(400,"設備不存在或已停用，請重新選擇設備"));}
    public Map<String,Object> edit(Long id,User actor,Requests.TicketInput input){
        // Asset lock precedes Ticket lock; asset deactivation sees committed ticket links.
        Asset selectedAsset=assetFor(input.assetId());Ticket t=find(id,actor,true);active(t);
        if(input.version()==null||!input.version().equals(t.version))throw new ApiException(409,"工單已被更新，請重新載入最新資料後再編輯。本次輸入尚未儲存");
        Priority before=t.priority;Long previousAsset=t.asset==null?null:t.asset.getId();String oldAsset=t.asset==null?"無":t.asset.getCode();apply(t,input);t.asset=selectedAsset;log(t,actor,"編輯工單；優先級 "+before+" → "+t.priority);
        if(!Objects.equals(previousAsset,input.assetId()))log(t,actor,"關聯設備："+oldAsset+" → "+(selectedAsset==null?"無":selectedAsset.code));return detail(t);
    }
    public Map<String,Object> assign(Long id,User actor,Long technicianId,TicketStatus expectedStatus){
        if(!actor.canDispatch())throw new ApiException(403,"由報修人員或管理員安排派工");
        // Lock the technician before the ticket, as in start/deactivation, so assignments cannot race disable.
        User technician=users.lockById(technicianId).filter(u->u.enabled).orElseThrow(()->new ApiException(400,"請選擇啟用中的處理人員"));
        Ticket t=find(id,actor,true);

        if(expectedStatus!=null&&t.status!=expectedStatus)throw new ApiException(409,"工單已被其他人更新，請重新載入後確認指派");
        if(t.status!=TicketStatus.OPEN&&t.status!=TicketStatus.ASSIGNED)throw new ApiException(409,"只有待派工或已派工工單可以指派");
        if(t.assignedTo!=null&&t.assignedTo.getId().equals(technician.id))throw new ApiException(409,"已指派給此技師");
        String old=t.assignedTo==null?"未指派":t.assignedTo.getName();t.assignedTo=technician;t.status=TicketStatus.ASSIGNED;log(t,actor,"派工："+old+" → "+technician.name);notifications.publish(t,actor,"ASSIGNED","工單已派工，請查看負責技師與處理進度");return detail(t);
    }
    public Map<String,Object> previousStep(Long id,User actor,Long version){
        Ticket t=find(id,actor,true);
        if(!Objects.equals(version,t.version))throw new ApiException(409,"工單已更新，請返回列表後重新開啟，再確認上一步");
        TicketStatus previous=t.status;
        if(previous!=TicketStatus.ASSIGNED&&previous!=TicketStatus.IN_PROGRESS)throw new ApiException(409,"只有已派工或維修中的工單可以退回上一步；待驗收請使用退回維修");
        t.status=previous==TicketStatus.IN_PROGRESS?TicketStatus.ASSIGNED:TicketStatus.OPEN;
        String assignee=t.assignedTo==null?"未指派":t.assignedTo.getName();
        if(t.status==TicketStatus.OPEN)t.assignedTo=null;
        t.startedAt=null;
        log(t,actor,"退回上一步："+previous+" → "+t.status+(t.status==TicketStatus.OPEN?"；解除指派："+assignee:""));
        notifications.publish(t,actor,"PREVIOUS_STEP",t.status==TicketStatus.OPEN?"工單已退回待派工，請重新安排人員":"工單已退回已派工，等待重新開始維修");
        return detail(t);
    }
    public Map<String,Object> status(Long id,User actor,TicketStatus next){
        users.lockById(actor.id).filter(u->u.enabled).orElseThrow(()->new ApiException(401,"帳號已停用，請重新登入"));
        Ticket t=find(id,actor,true);TicketStatus previous=t.status;
        boolean allowed=false;
        if(next==TicketStatus.IN_PROGRESS){allowed=previous==TicketStatus.ASSIGNED;}
        if(next==TicketStatus.CLOSED){allowed=previous==TicketStatus.RESOLVED;}
        if(next==TicketStatus.CANCELLED){allowed=previous==TicketStatus.OPEN||previous==TicketStatus.ASSIGNED;}
        if(!allowed)throw new ApiException(409,"不允許此狀態轉換；維修完成請提交維修紀錄");
        if(next==TicketStatus.IN_PROGRESS)requireQuoteAccepted(t);
        t.status=next;if(next==TicketStatus.IN_PROGRESS)t.startedAt=Instant.now();if(next==TicketStatus.CLOSED)t.closedAt=Instant.now();log(t,actor,previous+" → "+next);
        notifications.publish(t,actor,next.name(),switch(next){case IN_PROGRESS->"技師已開始維修";case CLOSED->"工單已確認結案";default->"工單已取消";});return detail(t);
    }
    private void requireQuoteAccepted(Ticket t){quotes.findFirstByTicketIdOrderByIdDesc(t.id).ifPresent(q->{if(!q.status.equals("ACCEPTED"))throw new ApiException(409,"請先取得會員對最新維修報價的同意");});}
    public Map<String,Object> saveRepairDraft(Long id,User actor,Requests.RepairDraft input){
        Ticket t=find(id,actor,true);

        if(t.status!=TicketStatus.IN_PROGRESS)throw new ApiException(409,"需先開始維修，才能儲存費用草稿");
        if(!Objects.equals(input.version(),t.version))throw new ApiException(409,"工單已更新，請重新開啟工單後確認費用");
        TicketEntry draft=entries.findByTicketIdOrderByIdAsc(id).stream().filter(e->e.kind.equals("REPAIR_DRAFT")).findFirst().orElseGet(()->entry(t,actor,"REPAIR_DRAFT",input.description()));
        draft.content=input.description().strip();draft.author=actor;draft.parts.clear();
        RepairCosts.apply(draft,new Requests.Repair(input.description(),input.workHours(),input.laborCost(),input.parts(),input.version()));
        log(t,actor,"儲存維修費用草稿");return detail(t);
    }
    public Map<String,Object> repair(Long id,User actor,Requests.Repair input){
        Ticket t=find(id,actor,true);
        if(t.status!=TicketStatus.IN_PROGRESS)throw new ApiException(409,"需先開始維修");
        requireQuoteAccepted(t);
        var drafts=entries.findByTicketIdOrderByIdAsc(id).stream().filter(e->e.kind.equals("REPAIR_DRAFT")).toList();
        if((input.version()!=null&&!input.version().equals(t.version))||(!drafts.isEmpty()&&input.version()==null))throw new ApiException(409,"工單已更新，請重新開啟工單後確認費用");
        if(!drafts.isEmpty()&&(input.workHours()==null||input.laborCost()==null))throw new ApiException(400,"請確認草稿費用後再完成維修");
        entries.deleteAll(drafts);
        t.resolvedAt=Instant.now();TicketEntry repair=entry(t,actor,"REPAIR",input.description());RepairCosts.apply(repair,input);repair.startedAt=t.startedAt;repair.completedAt=t.resolvedAt;t.status=TicketStatus.RESOLVED;log(t,actor,"IN_PROGRESS → RESOLVED");notifications.publish(t,actor,"RESOLVED","維修已完成，請查看紀錄並確認驗收");return detail(t);
    }
    public Map<String,Object> correctCosts(Long id,User actor,Requests.CostCorrection input){
        Ticket t=find(id,actor,true);
        if(t.status!=TicketStatus.RESOLVED&&t.status!=TicketStatus.CLOSED)throw new ApiException(409,"待驗收或已結案工單才能補登／更正費用；維修中請使用費用草稿");
        if(!Objects.equals(t.version,input.version()))throw new ApiException(409,"工單已更新，請重新開啟後確認費用；本次更正尚未儲存");
        var repairs=entries.findByTicketIdOrderByIdAsc(id).stream().filter(e->e.kind.equals("REPAIR")).toList();
        TicketEntry repair;
        if(input.repairId()==null){
            if(!repairs.isEmpty())throw new ApiException(409,"已有維修紀錄，請選擇要更正的紀錄");
            repair=entry(t,actor,"REPAIR","補登維修費用");
            repair.startedAt=t.startedAt;
            repair.completedAt=t.resolvedAt!=null?t.resolvedAt:t.closedAt!=null?t.closedAt:t.createdAt;
        }else repair=repairs.stream().filter(e->e.id.equals(input.repairId())).findFirst().orElseThrow(ApiException::missing);
        String beforeHours=costText(repair.workHours),beforeLabor=costText(repair.laborCost),beforeParts=costText(repair.partsCost),beforeTotal=costText(repair.totalCost);
        repair.parts.clear();
        RepairCosts.apply(repair,new Requests.Repair(repair.content,input.workHours(),input.laborCost(),input.parts(),input.version()));
        entry(t,actor,"COST_CORRECTION","維修紀錄 #"+repair.id+" 費用更正\n工時："+beforeHours+" → "+costText(repair.workHours)+
            "\n人工費："+beforeLabor+" → "+costText(repair.laborCost)+"\n零件費："+beforeParts+" → "+costText(repair.partsCost)+
            "\n合計（NT$）："+beforeTotal+" → "+costText(repair.totalCost)+"\n原因："+input.reason().strip());
        log(t,actor,"補登／更正維修紀錄 #"+repair.id+" 費用");
        return detail(t);
    }
    private static String costText(java.math.BigDecimal value){return value==null?"未登錄":value.toPlainString();}
    public Map<String,Object> rework(Long id,User actor,String reason){

        // Same user -> ticket lock order as assignment/start/deactivation.
        User technician=tickets.findAssigneeId(id).flatMap(users::lockById).orElse(null);
        Ticket t=find(id,actor,true);

        if(t.status!=TicketStatus.RESOLVED)throw new ApiException(409,"只有待確認的工單可以退回維修，請更新工單資料");
        if(t.assignedTo!=null&&(technician==null||!t.assignedTo.getId().equals(technician.id)))throw new ApiException(409,"負責技師已變更，請更新工單資料後重試");
        entry(t,actor,"REWORK",reason);
        String route;
        if(technician!=null&&technician.enabled){
            t.status=TicketStatus.ASSIGNED;route="交由 "+technician.name+" 再次維修";
        }else{
            t.status=TicketStatus.OPEN;t.assignedTo=null;route="原技師 "+(technician==null?"未指定":technician.name)+" 無法接單，回到待派工";
        }
        t.startedAt=null;t.resolvedAt=null;
        log(t,actor,"驗收退回：RESOLVED → "+t.status+"；"+route);
        notifications.publish(t,actor,"REWORK","工單已退回維修，請查看退回原因與派工狀態");
        return detail(t);
    }
    public Map<String,Object> comment(Long id,User actor,String content){Ticket t=find(id,actor,true);active(t);entry(t,actor,"COMMENT",content);log(t,actor,"新增留言");notifications.publish(t,actor,"COMMENT","工單有新留言");return detail(t);}
    public Map<String,Object> get(Long id,User actor){return detail(find(id,actor,false));}
    public Map<String,Object> unlinkedAssets(User actor,String query,int page,int size){
        if(page<0||size<1||size>100)throw new ApiException(400,"分頁條件不正確");
        var spec=TicketFilters.matching(actor,query,null,false,null,null).and((root,q,cb)->cb.isNull(root.get("asset")));
        var result=tickets.findAll(spec,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"id")));
        var items=result.getContent().stream().map(t->{var item=view(t);item.put("repairCostSummary",detail(t).get("repairCostSummary"));return item;}).toList();
        return Map.of("items",items,"total",result.getTotalElements(),"page",page,"totalPages",result.getTotalPages());
    }
    public Map<String,Object> linkAsset(Long id,User actor,Requests.AssetLink input){
        // Follow the same asset -> ticket lock order as reporting and asset retirement.
        Asset asset=assetFor(input.assetId());Ticket t=find(id,actor,true);
        if(!Objects.equals(input.version(),t.version))throw new ApiException(409,"工單已更新，請重新載入後確認設備");
        if(t.asset!=null)throw new ApiException(409,"此工單已連結設備，請重新載入確認");
        if(t.status==TicketStatus.CANCELLED)throw new ApiException(409,"已取消工單不能補連結設備");
        t.asset=asset;log(t,actor,"補連結設備："+asset.code+" · "+asset.name);return detail(t);
    }
    public Map<String,Object> view(Ticket t){
        Map<String,Object> m=new LinkedHashMap<>();m.put("id",t.id);m.put("version",t.version);m.put("ticketNo",t.ticketNo);m.put("title",t.title);m.put("description",t.description);m.put("location",t.location);m.put("category",t.category);m.put("priority",t.priority);m.put("status",t.status);
        m.put("createdBy",Map.of("id",t.createdBy.getId(),"name",t.createdBy.getName()));m.put("assignedTo",t.assignedTo==null?null:Map.of("id",t.assignedTo.getId(),"name",t.assignedTo.getName()));
        m.put("asset",t.asset==null?null:Map.of("id",t.asset.getId(),"code",t.asset.getCode(),"name",t.asset.getName(),"location",t.asset.getLocation(),"category",t.asset.getCategory(),"enabled",t.asset.isEnabled()));
        m.put("createdAt",t.createdAt);m.put("updatedAt",t.updatedAt);m.put("dueAt",t.dueAt);m.put("startedAt",t.startedAt);m.put("resolvedAt",t.resolvedAt);m.put("closedAt",t.closedAt);m.put("overdue",overdue(t));return m;
    }
    public boolean overdue(Ticket t){return t.status!=TicketStatus.CLOSED&&t.status!=TicketStatus.CANCELLED&&t.status!=TicketStatus.RESOLVED&&Instant.now().isAfter(t.dueAt);}
    private Map<String,Object> detail(Ticket t){
        // Mutations must return the committed revision rather than a pre-flush @Version value.
        tickets.flush();
        Map<String,Object> result=view(t);List<TicketEntry> timeline=entries.findByTicketIdOrderByIdAsc(t.id);
        for(String kind:List.of("COMMENT","REPAIR","ACTIVITY"))result.put(kind.equals("COMMENT")?"comments":kind.equals("REPAIR")?"repairs":"activities",timeline.stream().filter(e->e.kind.equals(kind)).map(this::entryView).toList());
        var repairs=timeline.stream().filter(e->e.kind.equals("REPAIR")).toList();long priced=repairs.stream().filter(e->e.totalCost!=null).count();
        result.put("repairDraft",timeline.stream().filter(e->e.kind.equals("REPAIR_DRAFT")).findFirst().map(this::entryView).orElse(null));
        result.put("repairCostSummary",Map.of("currency","TWD","recordedTotal",repairs.stream().map(e->e.totalCost).filter(Objects::nonNull).reduce(new java.math.BigDecimal("0.00"),java.math.BigDecimal::add),"recordedRepairs",priced,"unpricedRepairs",repairs.size()-priced));
        result.put("reworkRequests",timeline.stream().filter(e->e.kind.equals("REWORK")).map(this::entryView).toList());
        result.put("costChanges",timeline.stream().filter(e->e.kind.equals("COST_CORRECTION")).map(this::entryView).toList());
        result.put("attachments",attachments.findByTicketIdOrderByIdAsc(t.id).stream().map(a->Map.of("id",a.id,"fileName",a.fileName,"size",a.size,"createdAt",a.createdAt)).toList());return result;
    }
    private Map<String,Object> entryView(TicketEntry e){Map<String,Object> m=new LinkedHashMap<>();m.put("id",e.id);m.put("content",e.content);m.put("author",e.author.getName());m.put("createdAt",e.createdAt);m.put("startedAt",e.startedAt);m.put("completedAt",e.completedAt);
        if(e.kind.equals("REPAIR")||e.kind.equals("REPAIR_DRAFT")){m.put("workHours",e.workHours);m.put("laborCost",e.laborCost);m.put("partsCost",e.partsCost);m.put("totalCost",e.totalCost);m.put("currency","TWD");m.put("parts",e.parts.stream().map(p->Map.of("name",p.name,"quantity",p.quantity,"unitPrice",p.unitPrice,"lineTotal",p.lineTotal)).toList());}return m;}
}
