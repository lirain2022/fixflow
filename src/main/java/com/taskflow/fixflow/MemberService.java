package com.taskflow.fixflow;
import java.util.*;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import com.taskflow.entity.TicketStatus;
@Service @Transactional public class MemberService {
 private final TicketService tickets;private final TicketRepository repository;
 public MemberService(TicketService tickets,TicketRepository repository){this.tickets=tickets;this.repository=repository;}
 // Check ownership without caching an unlocked entity before workflow locks are acquired.
 public void requireOwnership(Long id,User actor){if(!repository.existsByIdAndCreatedById(id,actor.id))throw ApiException.missing();}
 public Ticket requireOwned(Long id,User actor,boolean lock){Ticket t=tickets.find(id,actor,lock);if(!t.createdBy.getId().equals(actor.id))throw ApiException.missing();return t;}
 public Map<String,Object> detail(Long id,User actor){requireOwned(id,actor,false);return view(tickets.get(id,actor));}
 public Map<String,Object> view(Map<String,Object> source){Map<String,Object> out=new LinkedHashMap<>();for(String key:List.of("id","ticketNo","title","description","location","category","priority","status","assignedTo","createdAt","updatedAt","resolvedAt","closedAt","comments","repairs","repairCostSummary","reworkRequests","attachments"))if(source.containsKey(key))out.put(key,source.get(key));return out;}
 public Map<String,Object> list(User actor,String query,TicketStatus status,int page,int size,boolean active){
  if(page<0||size<1||size>100)throw new ApiException(400,"分頁條件不正確");
  var spec=TicketFilters.matching(actor,query,status,false,null,null).and(TicketFilters.scope(actor,TicketScope.CREATED));
  if(active)spec=spec.and(activeStatuses());
  var rows=repository.findAll(TicketOrder.NEWEST.apply(spec),org.springframework.data.domain.PageRequest.of(page,size));
  return Map.of("items",rows.getContent().stream().map(t->view(tickets.view(t))).toList(),"total",rows.getTotalElements(),"page",page,"totalPages",rows.getTotalPages());
 }
 private org.springframework.data.jpa.domain.Specification<Ticket> activeStatuses(){return (r,q,c)->r.get("status").in(TicketStatus.OPEN,TicketStatus.ASSIGNED,TicketStatus.IN_PROGRESS);}
 public Map<String,Long> summary(User actor){var own=TicketFilters.scope(actor,TicketScope.CREATED);return Map.of("active",repository.count(own.and(activeStatuses())),"awaitingAcceptance",repository.count(own.and(TicketFilters.status(TicketStatus.RESOLVED))),"closed",repository.count(own.and(TicketFilters.status(TicketStatus.CLOSED))));}
 public Map<String,Object> create(User actor,Requests.TicketInput input){if(input.assetId()!=null)throw new ApiException(400,"會員報修請在描述填寫設備名稱");return view(tickets.create(actor,input));}
 public Map<String,Object> action(Long id,User actor,String action,String content){requireOwnership(id,actor);return switch(action){case "comment"->view(tickets.comment(id,actor,content));case "rework"->view(tickets.rework(id,actor,content));case "accept"->view(tickets.status(id,actor,TicketStatus.CLOSED));case "cancel"->view(tickets.status(id,actor,TicketStatus.CANCELLED));default->throw ApiException.missing();};}
}
