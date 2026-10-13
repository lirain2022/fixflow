package com.taskflow.fixflow;

import java.math.BigDecimal;
import java.util.List;

final class RepairCosts {
    private RepairCosts(){}
    static void apply(TicketEntry entry,Requests.Repair input){
        // Historical/legacy submissions without any cost fields remain unknown, not free.
        if(input.workHours()==null&&input.laborCost()==null&&input.parts()==null)return;
        if(input.workHours()==null||input.laborCost()==null)throw new ApiException(400,"請一併填寫實際工時與人工費，無費用請填 0");
        entry.workHours=input.workHours().setScale(2);entry.laborCost=input.laborCost().setScale(2);
        entry.partsCost=new BigDecimal("0.00");
        for(Requests.RepairPartInput line:input.parts()==null?List.<Requests.RepairPartInput>of():input.parts()){
            RepairPart part=new RepairPart();part.name=line.name().strip();part.quantity=line.quantity().intValueExact();part.unitPrice=line.unitPrice().setScale(2);part.lineTotal=part.unitPrice.multiply(BigDecimal.valueOf(part.quantity));
            entry.parts.add(part);entry.partsCost=entry.partsCost.add(part.lineTotal);
        }
        entry.totalCost=entry.laborCost.add(entry.partsCost);
    }
}
