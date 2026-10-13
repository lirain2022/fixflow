package com.taskflow.fixflow;

import jakarta.persistence.*;
import java.time.*;

@Entity @Table(name="ff_assets") @lombok.Getter
public class Asset {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) public Long id;
    @Version public Long version;
    @Column(nullable=false,unique=true,length=40) public String code;
    @Column(nullable=false,length=120) public String name;
    @Column(nullable=false,length=200) public String location;
    @Column(nullable=false,length=120) public String model="";
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=30) public Category category;
    public LocalDate warrantyUntil;
    @Column(nullable=false) public boolean enabled=true;
    @Column(nullable=false) public Instant createdAt=Instant.now();
    @Column(nullable=false) public Instant updatedAt=Instant.now();
}
