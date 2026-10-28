package com.taskflow.fixflow;

import jakarta.persistence.*;
import java.time.Instant;

@Entity @Table(name="ff_notifications")
public class TicketNotification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public User recipient;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public Ticket ticket;
    @Column(nullable=false,length=30) public String kind;
    @Column(nullable=false,length=200) public String message;
    @Column(nullable=false) public Instant createdAt=Instant.now();
    public Instant readAt;
    public Long partRequestId;
}
