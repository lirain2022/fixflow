package com.taskflow.fixflow;
import java.util.*;import org.springframework.data.jpa.repository.*;import org.springframework.data.domain.*;import jakarta.persistence.LockModeType;
public interface PartRequestRepository extends JpaRepository<PartRequest,Long>{
 @EntityGraph(attributePaths={"ticket","requestedBy"}) Page<PartRequest> findByRequestedByIdOrderByIdDesc(Long id,Pageable pageable);
 @EntityGraph(attributePaths={"ticket","requestedBy"}) List<PartRequest> findByTicketIdOrderByIdDesc(Long id);
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select p from PartRequest p where p.id=:id") Optional<PartRequest> lockById(Long id);
 @Query("select p.ticket.id from PartRequest p where p.id=:id") Optional<Long> ticketId(Long id);
}
