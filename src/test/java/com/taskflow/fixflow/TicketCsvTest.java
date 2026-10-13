package com.taskflow.fixflow;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class TicketCsvTest {
    @Test void quotesTextAndNeutralizesSpreadsheetFormulas(){
        for(String unsafe:List.of("=1+1"," +SUM(A1)","-1+2","@SUM(A1)","\ttext","\rtext","\ntext"," \t=1"))assertTrue(TicketCsv.cell(unsafe).startsWith("\"'"),unsafe);
        assertEquals("\"a,\"\"b\"\"\nnext\"",TicketCsv.cell("a,\"b\"\nnext"));
        assertEquals("\"維修完成\"",TicketCsv.cell("維修完成"));
        assertEquals("\"\"",TicketCsv.cell(null));
    }
    @Test void oversizedExportFailsInsteadOfReturningPartialData(){
        var repository=mock(TicketRepository.class);
        when(repository.findAll(org.mockito.ArgumentMatchers.<Specification<Ticket>>any(),any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of(new Ticket()),PageRequest.of(0,5001),5002));
        var service=new TicketService(repository,null,null,null,null,null);
        User actor=new User();actor.role=Role.ADMIN;
        var error=assertThrows(ApiException.class,()->service.export(actor,"",null,false,null,null,TicketOrder.NEWEST,TicketScope.ALL));
        assertTrue(error.getMessage().contains("5,000"));
    }
}
