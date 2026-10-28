package com.taskflow.fixflow;
import jakarta.persistence.*;import java.time.Instant;
@Entity @Table(name="ff_part_requests") public class PartRequest {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) public Ticket ticket;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) public User requestedBy;
 @Column(nullable=false,length=120) public String name;
 @Column(nullable=false) public int quantity;
 @Column(nullable=false,length=2000) public String purpose;
 @Column(length=1000) public String referenceUrl;
 @Column(nullable=false,length=20) public String status="PENDING";
 @Column(length=2000) public String reply;
 @ManyToOne(fetch=FetchType.LAZY) public User reviewedBy;
 @Column(nullable=false) public Instant createdAt=Instant.now();
 @Column(nullable=false) public Instant updatedAt=Instant.now();
 @Version public Long version;
}
