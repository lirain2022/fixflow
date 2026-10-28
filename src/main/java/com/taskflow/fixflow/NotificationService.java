package com.taskflow.fixflow;

import java.time.Instant;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

@Service @Transactional
public class NotificationService {
    private final NotificationRepository notifications;
    private final UserRepository users;
    public NotificationService(NotificationRepository notifications,UserRepository users){this.notifications=notifications;this.users=users;}
    @Transactional(propagation=Propagation.MANDATORY)
    public void publish(Ticket ticket,User actor,String kind,String message){
        Map<Long,User> recipients=new LinkedHashMap<>();
        for(User user:users.findByRoleAndEnabledTrueOrderByName(Role.ADMIN))recipients.put(user.getId(),user);
        recipients.put(ticket.createdBy.getId(),ticket.createdBy);
        if(ticket.assignedTo!=null)recipients.put(ticket.assignedTo.getId(),ticket.assignedTo);
        recipients.remove(actor.id);
        for(User user:recipients.values())if(user.isEnabled()){
            TicketNotification notification=new TicketNotification();notification.ticket=ticket;notification.recipient=user;notification.kind=kind;notification.message=message;notifications.save(notification);
        }
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void partRequest(Ticket ticket,User actor,Long requestId,boolean reply,String message){
        List<User> recipients=reply?List.of(ticket.createdBy):users.findByRoleAndEnabledTrueOrderByName(Role.ADMIN);
        for(User user:recipients)if(user.isEnabled()&&!user.getId().equals(actor.id)){TicketNotification n=new TicketNotification();n.ticket=ticket;n.recipient=user;n.kind=reply?"PART_REPLY":"PART_REQUEST";n.message=message;n.partRequestId=requestId;notifications.save(n);}
    }
    @Transactional(readOnly=true)
    public Map<String,Object> list(User actor,int page,int size,boolean unreadOnly){
        if(page<0||size<1||size>100)throw new ApiException(400,"分頁條件不正確");
        var rows=notifications.feed(actor.id,unreadOnly,PageRequest.of(page,size,Sort.by(Sort.Direction.DESC,"id")));
        return Map.of("items",rows.getContent().stream().map(this::view).toList(),"total",rows.getTotalElements(),"page",page,"totalPages",rows.getTotalPages(),"unreadCount",notifications.unread(actor.id));
    }
    @Transactional(readOnly=true)
    public Map<String,Long> unread(User actor){return Map.of("unreadCount",notifications.unread(actor.id));}
    public void read(User actor,Long id){if(notifications.markRead(actor.id,id,Instant.now())==0)throw ApiException.missing();}
    public void readAll(User actor){notifications.markAllRead(actor.id,Instant.now());}
    private Map<String,Object> view(TicketNotification n){
        Map<String,Object> result=new LinkedHashMap<>();result.put("id",n.id);result.put("partRequestId",n.partRequestId);result.put("ticketId",n.ticket.getId());result.put("ticketNo",n.ticket.getTicketNo());result.put("title",n.ticket.getTitle());result.put("kind",n.kind);result.put("message",n.message);result.put("createdAt",n.createdAt);result.put("readAt",n.readAt);return result;
    }
}
