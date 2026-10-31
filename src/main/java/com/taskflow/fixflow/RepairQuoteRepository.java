package com.taskflow.fixflow;
import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface RepairQuoteRepository extends JpaRepository<RepairQuote,Long> {
 Optional<RepairQuote> findFirstByTicketIdOrderByIdDesc(Long ticketId);
 List<RepairQuote> findByTicketIdOrderByIdDesc(Long ticketId);
 @org.springframework.data.jpa.repository.Query("select count(q)>0 from RepairQuote q where q.ticket.createdBy.id=:ownerId and q.status<>'ACCEPTED' and q.ticket.status in :statuses and q.id=(select max(newer.id) from RepairQuote newer where newer.ticket.id=q.ticket.id)")
 boolean hasOutstandingConsent(Long ownerId,List<com.taskflow.entity.TicketStatus> statuses);
}
