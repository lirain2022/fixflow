package com.taskflow.fixflow;

import org.springframework.data.jpa.domain.Specification;

/** Whitelisted business ordering, shared by paginated lists and CSV exports. */
public enum TicketOrder {
    NEWEST, OLDEST, DUE_SOON, PRIORITY;

    public Specification<Ticket> apply(Specification<Ticket> filter){
        return (root,query,cb)->{
            var predicate=filter.toPredicate(root,query,cb);
            // Count queries must stay aggregate-only, especially on PostgreSQL.
            if(query.getResultType()!=Long.class&&query.getResultType()!=long.class){
                switch(this){
                    case NEWEST -> query.orderBy(cb.desc(root.get("id")));
                    case OLDEST -> query.orderBy(cb.asc(root.get("id")));
                    case DUE_SOON -> query.orderBy(cb.asc(root.get("dueAt")),cb.desc(root.get("id")));
                    case PRIORITY -> query.orderBy(cb.asc(cb.selectCase(root.<Priority>get("priority"))
                        .when(Priority.CRITICAL,0).when(Priority.HIGH,1).when(Priority.MEDIUM,2).otherwise(3)),cb.asc(root.get("dueAt")),cb.desc(root.get("id")));
                }
            }
            return predicate;
        };
    }
}
