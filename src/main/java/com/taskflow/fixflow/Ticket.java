package com.taskflow.fixflow;
import jakarta.persistence.*;
import java.time.Instant;
import com.taskflow.entity.TicketStatus;
@Entity @Table(name="ff_tickets") @lombok.Getter
public class Ticket {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Version public Long version;
    @Column(unique=true,length=40) public String ticketNo;
    @Column(nullable=false,length=120) public String title;
    @Column(nullable=false,length=4000) public String description;
    @Column(nullable=false,length=200) public String location;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) public Category category;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) public Priority priority;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) public TicketStatus status=TicketStatus.OPEN;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public User createdBy;
    @ManyToOne(fetch=FetchType.LAZY) public User assignedTo;
    @ManyToOne(fetch=FetchType.LAZY) public Asset asset;
    @Column(nullable=false) public Instant createdAt=Instant.now();
    @Column(nullable=false) public Instant updatedAt=Instant.now();
    @Column(nullable=false) public Instant dueAt;
    public Instant startedAt;
    public Instant resolvedAt;
    public Instant closedAt;
}
