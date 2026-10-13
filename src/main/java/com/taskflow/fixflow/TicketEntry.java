package com.taskflow.fixflow;
import jakarta.persistence.*;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.*;
/** Append-only timeline entries: COMMENT, REPAIR, REWORK, or ACTIVITY. */
@Entity @Table(name="ff_entries")
public class TicketEntry {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public Ticket ticket;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public User author;
    @Column(nullable=false,length=20) public String kind;
    @Column(nullable=false,length=4000) public String content;
    @Column(nullable=false) public Instant createdAt=Instant.now();
    public Instant startedAt;
    public Instant completedAt;
    @Column(precision=6,scale=2) public BigDecimal workHours;
    @Column(precision=12,scale=2) public BigDecimal laborCost;
    @Column(precision=16,scale=2) public BigDecimal partsCost;
    @Column(precision=16,scale=2) public BigDecimal totalCost;
    @ElementCollection @CollectionTable(name="ff_repair_parts",joinColumns=@JoinColumn(name="entry_id"))
    @OrderColumn(name="line_no") public List<RepairPart> parts=new ArrayList<>();
}
