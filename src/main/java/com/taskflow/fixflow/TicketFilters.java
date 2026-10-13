package com.taskflow.fixflow;
import java.time.Instant;
import java.util.*;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import com.taskflow.entity.TicketStatus;
/** Shared by personal counts and lists so both obey the same visibility boundary. */
public final class TicketFilters {
    private TicketFilters() {}
    public static Specification<Ticket> matching(User actor,String query,TicketStatus status,boolean overdue,Priority priority,Long assigneeId){
        if(query.length()>200||(assigneeId!=null&&assigneeId<1))throw new ApiException(400,"搜尋條件不正確");
        Instant now=Instant.now();
        return (root,q,cb)->{
            List<Predicate> parts=new ArrayList<>();
            parts.add(visibleTo(actor).toPredicate(root,q,cb));
            if(overdue)parts.add(overdue(now).toPredicate(root,q,cb));
            if(status!=null)parts.add(cb.equal(root.get("status"),status));
            if(priority!=null)parts.add(cb.equal(root.get("priority"),priority));
            if(assigneeId!=null)parts.add(cb.equal(root.get("assignedTo").get("id"),assigneeId));
            if(!query.isBlank()){
                String value="%"+query.strip().toLowerCase(Locale.ROOT).replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
                parts.add(cb.or(cb.like(cb.lower(root.get("title")),value,'\\'),cb.like(cb.lower(root.get("ticketNo")),value,'\\'),cb.like(cb.lower(root.get("location")),value,'\\')));
            }
            return cb.and(parts.toArray(Predicate[]::new));
        };
    }
    public static Specification<Ticket> scope(User actor,TicketScope scope){
        return (root,q,cb)->{
            var own=cb.equal(root.get("createdBy").get("id"),actor.id);
            var assigned=cb.equal(root.get("assignedTo").get("id"),actor.id);
            return switch(scope){
                case ALL -> cb.conjunction();
                case CREATED -> own;
                case ASSIGNED -> assigned;
                case ACTION_REQUIRED -> cb.and(visibleTo(actor).toPredicate(root,q,cb),root.get("status").in(TicketStatus.OPEN,TicketStatus.ASSIGNED,TicketStatus.IN_PROGRESS,TicketStatus.RESOLVED));
            };
        };
    }
    public static Specification<Ticket> visibleTo(User actor){return (root,q,cb)->actor.role==Role.ADMIN?cb.conjunction():cb.or(cb.equal(root.get("createdBy").get("id"),actor.id),cb.equal(root.get("assignedTo").get("id"),actor.id));}
    public static Specification<Ticket> status(TicketStatus status){return (root,q,cb)->cb.equal(root.get("status"),status);}
    public static Specification<Ticket> overdue(Instant now){return (root,q,cb)->cb.and(root.get("status").in(TicketStatus.OPEN,TicketStatus.ASSIGNED,TicketStatus.IN_PROGRESS),cb.lessThan(root.get("dueAt"),now));}
}
