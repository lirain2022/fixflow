package com.taskflow.fixflow;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="ff_users") @lombok.Getter
public class User {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Column(nullable=false,length=80) public String name;
    @Column(nullable=false,unique=true,length=254) public String email;
    @Column(nullable=false) public String passwordHash;
    @Column(nullable=false) public long authVersion=0;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) public Role role=Role.CUSTOMER;
    @Column(nullable=false) public boolean enabled=true;
    @Column(nullable=false) public Instant createdAt=Instant.now();
    public boolean canDispatch(){return enabled;}
}
