package com.taskflow.fixflow;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Snapshot of the part name and price used in this repair round. */
@Embeddable
public class RepairPart {
    @Column(name="part_name",nullable=false,length=120) public String name;
    @Column(nullable=false) public int quantity;
    @Column(nullable=false,precision=12,scale=2) public BigDecimal unitPrice;
    @Column(nullable=false,precision=16,scale=2) public BigDecimal lineTotal;
}
