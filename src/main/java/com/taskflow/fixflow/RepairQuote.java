package com.taskflow.fixflow;
import jakarta.persistence.*;import java.math.BigDecimal;import java.time.Instant;
@Entity @Table(name="ff_repair_quotes")
public class RepairQuote {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) public Ticket ticket;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) public User createdBy;
 @Column(nullable=false,precision=12,scale=2) public BigDecimal laborCost;
 @Column(nullable=false,precision=12,scale=2) public BigDecimal partsCost;
 @Column(nullable=false,length=2000) public String description;
 @Column(nullable=false,length=30) public String status="PENDING";
 @Column(length=2000) public String response;
 @ManyToOne(fetch=FetchType.LAZY) public User respondedBy;
 @Column(nullable=false) public Instant createdAt=Instant.now();
 public Instant respondedAt;
 @Version public Long version;
}
