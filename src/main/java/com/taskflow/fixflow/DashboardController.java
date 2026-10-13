package com.taskflow.fixflow;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import tools.jackson.databind.ObjectMapper;
import com.taskflow.entity.TicketStatus;
@RestController @RequestMapping("/api/dashboard")
public class DashboardController {
    private final AuthService auth;private final TicketRepository tickets;private final TicketService service;private final StringRedisTemplate redis;private final ObjectMapper json;private final boolean cache;
    public DashboardController(AuthService auth,TicketRepository tickets,TicketService service,StringRedisTemplate redis,ObjectMapper json,@Value("${fixflow.redis-enabled:false}") boolean cache){this.auth=auth;this.tickets=tickets;this.service=service;this.redis=redis;this.json=json;this.cache=cache;}
    @GetMapping("/summary") @Transactional(readOnly=true) public Object summary(Authentication a){
        auth.admin(auth.current(a));
        if(cache)try{String value=redis.opsForValue().get("fixflow:dashboard:v1");if(value!=null)return json.readTree(value);}catch(RuntimeException ignored){ /* Redis is optional; database remains authoritative. */ }
        List<Ticket> all=tickets.findAll();Map<String,Object> result=new LinkedHashMap<>();result.put("total",all.size());
        result.put("today",all.stream().filter(t->t.createdAt.atZone(ZoneId.of("Asia/Taipei")).toLocalDate().equals(LocalDate.now(ZoneId.of("Asia/Taipei")))).count());
        result.put("inProgress",all.stream().filter(t->t.status==TicketStatus.IN_PROGRESS).count());result.put("resolved",all.stream().filter(t->t.status==TicketStatus.RESOLVED||t.status==TicketStatus.CLOSED).count());result.put("overdue",all.stream().filter(service::overdue).count());
        result.put("averageHours",all.stream().filter(t->t.resolvedAt!=null).mapToDouble(t->Duration.between(t.createdAt,t.resolvedAt).toSeconds()/3600.0).average().orElse(0));
        result.put("byStatus",Arrays.stream(TicketStatus.values()).map(s->Map.of("status",s,"count",all.stream().filter(t->t.status==s).count())).toList());result.put("generatedAt",Instant.now());
        if(cache)try{redis.opsForValue().set("fixflow:dashboard:v1",json.writeValueAsString(result),Duration.ofSeconds(15));}catch(RuntimeException ignored){ }
        return result;
    }
}
