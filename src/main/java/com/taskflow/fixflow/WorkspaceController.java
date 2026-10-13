package com.taskflow.fixflow;
import java.time.Instant;
import java.util.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import com.taskflow.entity.TicketStatus;

@RestController @RequestMapping("/api/workspace") @Transactional(readOnly=true)
public class WorkspaceController {
    private final AuthService auth;private final TicketRepository tickets;private final UserRepository users;
    public WorkspaceController(AuthService auth,TicketRepository tickets,UserRepository users){this.auth=auth;this.tickets=tickets;this.users=users;}
    @GetMapping("/summary") public Object summary(Authentication authentication){
        var scope=TicketFilters.visibleTo(auth.current(authentication));
        Map<String,Long> counts=new LinkedHashMap<>();long total=0;
        for(var status:TicketStatus.values()){long count=tickets.count(scope.and(TicketFilters.status(status)));counts.put(status.name(),count);total+=count;}
        return Map.of("byStatus",counts,"total",total,"overdue",tickets.count(scope.and(TicketFilters.overdue(Instant.now()))));
    }
    @GetMapping("/technicians") public Object technicians(Authentication authentication){
        auth.dispatcher(auth.current(authentication));
        Map<Long,Map<TicketStatus,Long>> load=new HashMap<>();
        for(Object[] row:tickets.activeWorkload())load.computeIfAbsent(((Number)row[0]).longValue(),key->new EnumMap<>(TicketStatus.class)).put((TicketStatus)row[1],((Number)row[2]).longValue());
        Map<Long,Long> late=new HashMap<>();for(Object[] row:tickets.overdueWorkload(Instant.now()))late.put(((Number)row[0]).longValue(),((Number)row[1]).longValue());
        return users.findByEnabledTrueOrderByName().stream().map(user->{
            var counts=load.getOrDefault(user.id,Map.of());long assigned=counts.getOrDefault(TicketStatus.ASSIGNED,0L),progress=counts.getOrDefault(TicketStatus.IN_PROGRESS,0L);
            return Map.of("id",user.id,"name",user.name,"email",user.email,"assigned",assigned,"inProgress",progress,"active",assigned+progress,"overdue",late.getOrDefault(user.id,0L));
        }).toList();
    }
}
