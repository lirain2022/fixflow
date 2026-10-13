package com.taskflow.fixflow;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface AttachmentRepository extends JpaRepository<Attachment,Long> {
    List<Attachment> findByTicketIdOrderByIdAsc(Long ticketId);
    long countByTicketId(Long ticketId);
}
