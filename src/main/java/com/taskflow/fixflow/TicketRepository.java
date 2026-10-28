package com.taskflow.fixflow;
import java.util.*;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
public interface TicketRepository extends JpaRepository<Ticket,Long>,JpaSpecificationExecutor<Ticket> {
    boolean existsByIdAndCreatedById(Long id,Long createdById);
    boolean existsByAssetIdAndStatusIn(Long assetId,List<com.taskflow.entity.TicketStatus> statuses);
    @Query("select distinct t.asset.id from Ticket t where t.asset.id in :ids and t.status in :statuses")
    List<Long> activeAssetIds(List<Long> ids,List<com.taskflow.entity.TicketStatus> statuses);
    // Scalar lookup avoids caching an unlocked Ticket before the authoritative locked read.
    @Query("select t.assignedTo.id from Ticket t where t.id=:id")
    Optional<Long> findAssigneeId(Long id);
    @Query("select t.assignedTo.id, t.status, count(t) from Ticket t where t.assignedTo is not null and t.status in (com.taskflow.entity.TicketStatus.ASSIGNED, com.taskflow.entity.TicketStatus.IN_PROGRESS) group by t.assignedTo.id,t.status")
    List<Object[]> activeWorkload();
    @Query("select t.assignedTo.id, count(t) from Ticket t where t.assignedTo is not null and t.dueAt < :now and t.status in (com.taskflow.entity.TicketStatus.ASSIGNED, com.taskflow.entity.TicketStatus.IN_PROGRESS) group by t.assignedTo.id")
    List<Object[]> overdueWorkload(java.time.Instant now);
    boolean existsByAssignedToIdAndStatusIn(Long id,List<com.taskflow.entity.TicketStatus> statuses);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select t from Ticket t where t.id=:id")
    Optional<Ticket> lockById(Long id);
}
