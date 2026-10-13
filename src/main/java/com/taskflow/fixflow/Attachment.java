package com.taskflow.fixflow;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="ff_attachments")
public class Attachment {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public Ticket ticket;
    @ManyToOne(fetch=FetchType.LAZY,optional=false) public User uploadedBy;
    @Column(nullable=false,length=200) public String fileName;
    @Column(nullable=false,length=100) public String storageKey;
    @Column(nullable=false,length=40) public String contentType;
    @Column(nullable=false) public long size;
    @Column(nullable=false) public Instant createdAt=Instant.now();
}
