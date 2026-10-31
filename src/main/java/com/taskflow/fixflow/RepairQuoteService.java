package com.taskflow.fixflow;
import java.util.*;import java.math.BigDecimal;import java.time.Instant;
import jakarta.validation.constraints.*;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import com.taskflow.entity.TicketStatus;
@Service @Transactional
public class RepairQuoteService {
 public record Input(@Positive Long previousQuoteId,@NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal laborCost,@NotNull @DecimalMin("0") @Digits(integer=10,fraction=2) BigDecimal partsCost,@NotBlank @Size(max=2000) String description){}
 public record Response(@NotNull @Positive Long quoteId,@NotNull @PositiveOrZero Long version,@NotNull String decision,@Size(max=2000) String message){}
 private final RepairQuoteRepository quotes;private final TicketService tickets;private final MemberService members;private final NotificationService notifications;private final TicketRepository repository;private final UserRepository users;
 public RepairQuoteService(RepairQuoteRepository quotes,TicketService tickets,MemberService members,NotificationService notifications,TicketRepository repository,UserRepository users){this.quotes=quotes;this.tickets=tickets;this.members=members;this.notifications=notifications;this.repository=repository;this.users=users;}
 private boolean active(Ticket t){return List.of(TicketStatus.OPEN,TicketStatus.ASSIGNED,TicketStatus.IN_PROGRESS).contains(t.status);}
 private boolean eligible(Ticket t){return t.createdBy.getRole()!=Role.ADMIN&&t.createdBy.isEnabled();}
 private void requireActive(Ticket t){if(!active(t))throw new ApiException(409,"工單已進入驗收或已結束，不能變更報價");}
 public Map<String,Object> list(Long id,User actor,boolean member){Ticket t=member?members.requireOwned(id,actor,false):tickets.find(id,actor,false);return result(t);}
 public Map<String,Object> create(Long id,User actor,Input input){
  if(actor.role!=Role.ADMIN)throw new ApiException(403,"只有管理員可以報價");
  // Owner -> ticket lock order serializes quoting against account deactivation.
  Long ownerId=repository.findCreatorId(id).orElseThrow(ApiException::missing);
  users.lockById(ownerId).orElseThrow(ApiException::missing);
  Ticket t=tickets.find(id,actor,true);requireActive(t);
  if(!eligible(t))throw new ApiException(400,"此工單沒有可確認報價的會員，請使用原本維修流程");
  RepairQuote previous=quotes.findFirstByTicketIdOrderByIdDesc(id).orElse(null);
  if(!Objects.equals(input.previousQuoteId(),previous==null?null:previous.id))throw new ApiException(409,"報價已更新，請重新載入後確認");
  RepairQuote q=new RepairQuote();q.ticket=t;q.createdBy=actor;q.laborCost=input.laborCost().setScale(2);q.partsCost=input.partsCost().setScale(2);q.description=input.description().strip();quotes.saveAndFlush(q);
  tickets.log(t,actor,"送出維修報價 #"+q.id+"，預估 NT$ "+q.laborCost.add(q.partsCost).toPlainString());
  notifications.publish(t,actor,"QUOTE_SENT","維修報價待確認，請開啟工單查看");return result(t);
 }
 public Map<String,Object> respond(Long id,User actor,Response input){
  Ticket t=members.requireOwned(id,actor,true);requireActive(t);
  RepairQuote q=quotes.findFirstByTicketIdOrderByIdDesc(id).orElseThrow(ApiException::missing);
  if(!q.id.equals(input.quoteId())||!Objects.equals(q.version,input.version())||!q.status.equals("PENDING"))throw new ApiException(409,"報價已更新或已回覆，請重新載入確認最新金額");
  if(!List.of("ACCEPTED","CHANGES_REQUESTED").contains(input.decision()))throw new ApiException(400,"請選擇同意報價或提出問題");
  if(input.decision().equals("CHANGES_REQUESTED")&&(input.message()==null||input.message().isBlank()))throw new ApiException(400,"請填寫報價問題");
  q.status=input.decision();q.response=input.message()==null?null:input.message().strip();q.respondedBy=actor;q.respondedAt=Instant.now();quotes.saveAndFlush(q);
  tickets.log(t,actor,(q.status.equals("ACCEPTED")?"同意":"提出問題：")+"維修報價 #"+q.id);
  notifications.publish(t,actor,"QUOTE_RESPONSE",q.status.equals("ACCEPTED")?"會員已同意維修報價":"會員對報價提出問題，請查看後重新報價");return result(t);
 }
 private Map<String,Object> result(Ticket t){var history=quotes.findByTicketIdOrderByIdDesc(t.id).stream().map(this::view).toList();Map<String,Object> out=new LinkedHashMap<>();out.put("eligible",eligible(t));out.put("active",active(t));out.put("latest",history.isEmpty()?null:history.getFirst());out.put("history",history);return out;}
 private Map<String,Object> view(RepairQuote q){Map<String,Object> m=new LinkedHashMap<>();m.put("id",q.id);m.put("version",q.version);m.put("laborCost",q.laborCost.toPlainString());m.put("partsCost",q.partsCost.toPlainString());m.put("total",q.laborCost.add(q.partsCost).toPlainString());m.put("currency","TWD");m.put("description",q.description);m.put("status",q.status);m.put("response",q.response);m.put("createdAt",q.createdAt);m.put("createdBy",q.createdBy.getName());m.put("respondedAt",q.respondedAt);m.put("respondedBy",q.respondedBy==null?null:q.respondedBy.getName());return m;}
}
