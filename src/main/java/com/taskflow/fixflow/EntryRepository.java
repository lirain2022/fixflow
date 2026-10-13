package com.taskflow.fixflow;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
public interface EntryRepository extends JpaRepository<TicketEntry,Long> {
    @EntityGraph(attributePaths={"author","parts"}) List<TicketEntry> findByTicketIdOrderByIdAsc(Long ticketId);
}
