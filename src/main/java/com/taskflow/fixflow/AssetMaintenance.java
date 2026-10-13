package com.taskflow.fixflow;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Repository;
import com.taskflow.entity.TicketStatus;

/** Aggregate all visible history in the database, independently of the displayed page. */
@Repository
public class AssetMaintenance {
    private final EntityManager em;
    public AssetMaintenance(EntityManager em){this.em=em;}
    static Specification<Ticket> visibleAsset(Long id,User actor){
        return TicketFilters.visibleTo(actor).and((root,q,cb)->cb.equal(root.get("asset").get("id"),id));
    }
    public Map<String,Object> summary(Long id,User actor){
        var cb=em.getCriteriaBuilder();var spec=visibleAsset(id,actor);
        var ticketQuery=cb.createQuery(Object[].class);var ticket=ticketQuery.from(Ticket.class);
        ticketQuery.multiselect(cb.count(ticket),cb.sum(cb.<Long>selectCase().when(cb.equal(ticket.get("status"),TicketStatus.CANCELLED),1L).otherwise(0L)))
            .where(spec.toPredicate(ticket,ticketQuery,cb));
        Object[] counts=em.createQuery(ticketQuery).getSingleResult();

        var query=cb.createQuery(Object[].class);var entry=query.from(TicketEntry.class);
        var scope=query.from(Ticket.class);
        query.multiselect(cb.count(entry),cb.count(entry.get("totalCost")),
            cb.sum(entry.<BigDecimal>get("laborCost")),cb.sum(entry.<BigDecimal>get("partsCost")),cb.sum(entry.<BigDecimal>get("totalCost")),
            cb.greatest(cb.<Instant>coalesce(entry.get("completedAt"),entry.get("createdAt"))))
            .where(cb.equal(entry.get("kind"),"REPAIR"),cb.equal(entry.get("ticket").get("id"),scope.get("id")),spec.toPredicate(scope,query,cb));
        Object[] costs=em.createQuery(query).getSingleResult();
        long cancelled=number(counts[1]),priced=number(costs[1]);
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("currency","TWD");result.put("reportCount",number(counts[0])-cancelled);result.put("cancelledCount",cancelled);
        result.put("recordedRepairs",priced);result.put("unpricedRepairs",number(costs[0])-priced);
        result.put("laborCost",decimal(costs[2]));result.put("partsCost",decimal(costs[3]));result.put("totalCost",decimal(costs[4]));result.put("lastRepairAt",costs[5]);
        return result;
    }
    private static long number(Object value){return value==null?0:((Number)value).longValue();}
    private static BigDecimal decimal(Object value){return value==null?new BigDecimal("0.00"):(BigDecimal)value;}
}
