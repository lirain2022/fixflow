package com.taskflow.fixflow;

import java.time.Instant;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;

public interface NotificationRepository extends JpaRepository<TicketNotification,Long> {
    // Match TicketService visibility now, not just the permissions at delivery time.
    String SCOPE="n.recipient.id=:userId and (n.recipient.role=com.taskflow.fixflow.Role.ADMIN or n.ticket.createdBy.id=:userId)";
    @EntityGraph(attributePaths={"ticket"})
    @Query("select n from TicketNotification n where "+SCOPE+" and (:unreadOnly=false or n.readAt is null)")
    Page<TicketNotification> feed(Long userId,boolean unreadOnly,Pageable pageable);
    @Query("select count(n) from TicketNotification n where "+SCOPE+" and n.readAt is null")
    long unread(Long userId);
    @Modifying
    @Query("update TicketNotification target set target.readAt=coalesce(target.readAt,:now) where target.id=:id and target.id in (select n.id from TicketNotification n where "+SCOPE+")")
    int markRead(Long userId,Long id,Instant now);
    @Modifying
    @Query("update TicketNotification target set target.readAt=:now where target.readAt is null and target.id in (select n.id from TicketNotification n where "+SCOPE+")")
    int markAllRead(Long userId,Instant now);
}
