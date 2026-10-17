package com.taskflow.fixflow;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Report queries share ticket visibility and never count repair drafts. */
@Service
@Transactional(readOnly=true)
public class CostReportService {
    public enum Mode { RECORDED, MISSING, UNLINKED }
    private static final ZoneId ZONE=ZoneId.of("Asia/Taipei");
    private final NamedParameterJdbcTemplate jdbc;
    public CostReportService(NamedParameterJdbcTemplate jdbc){this.jdbc=jdbc;}
    public record Row(long id,long ticketId,String ticketNo,String title,String assetCode,String assetName,
                      String assigneeName,Instant date,BigDecimal laborCost,BigDecimal partsCost,BigDecimal totalCost) {}
    public record Summary(BigDecimal laborCost,BigDecimal partsCost,BigDecimal totalCost) {}
    public record Report(List<Row> items,long total,long totalPages,Summary summary) {}
    private record Query(String sql,Map<String,Object> params) {}
    private String visibility(User actor,Map<String,Object> params){
        params.put("actor",actor.id);
        return actor.role==Role.ADMIN?"1=1":"(t.created_by_id=:actor or t.assigned_to_id=:actor)";
    }
    public List<Map<String,Object>> people(User actor){
        var params=new HashMap<String,Object>();
        return jdbc.query("select distinct u.id,u.name from ff_tickets t join ff_users u on u.id=t.assigned_to_id where "+visibility(actor,params)+" order by u.name,u.id",params,
            (rs,n)->Map.<String,Object>of("id",rs.getLong("id"),"name",rs.getString("name")));
    }
    private Query query(User actor,Mode mode,LocalDate from,LocalDate to,String equipment,Long assigneeId){
        if(from!=null&&to!=null&&from.isAfter(to))throw new ApiException(400,"起始日期不可晚於結束日期");
        if((from!=null&&(from.getYear()<1900||from.getYear()>9998))||(to!=null&&(to.getYear()<1900||to.getYear()>9998)))throw new ApiException(400,"日期範圍不正確");
        if(equipment.length()>120||assigneeId!=null&&assigneeId<1)throw new ApiException(400,"篩選條件不正確");
        var params=new HashMap<String,Object>();
        boolean recorded=mode==Mode.RECORDED;
        String date=recorded?"coalesce(e.completed_at,e.created_at)":"t.created_at";
        String columns=recorded?"e.id,e.labor_cost,e.parts_cost,e.total_cost":"t.id,coalesce(c.labor_cost,0) labor_cost,coalesce(c.parts_cost,0) parts_cost,coalesce(c.total_cost,0) total_cost";
        String joins=recorded?" join ff_entries e on e.ticket_id=t.id and e.kind='REPAIR' and e.total_cost is not null ":
            " left join (select ticket_id,sum(labor_cost) labor_cost,sum(parts_cost) parts_cost,sum(total_cost) total_cost from ff_entries where kind='REPAIR' and total_cost is not null group by ticket_id) c on c.ticket_id=t.id ";
        String sql="select "+columns+",t.id ticket_id,t.ticket_no,t.title,a.code asset_code,a.name asset_name,u.name assignee_name,"+date+" report_date from ff_tickets t left join ff_assets a on a.id=t.asset_id left join ff_users u on u.id=t.assigned_to_id"+joins+" where "+visibility(actor,params);
        if(mode==Mode.MISSING)sql+=" and t.status<>'CANCELLED' and (exists (select 1 from ff_entries x where x.ticket_id=t.id and x.kind='REPAIR' and x.total_cost is null) or (t.status in ('RESOLVED','CLOSED') and not exists (select 1 from ff_entries x where x.ticket_id=t.id and x.kind='REPAIR')))";
        if(mode==Mode.UNLINKED)sql+=" and t.asset_id is null and t.status<>'CANCELLED'";
        if(from!=null){sql+=" and "+date+">=:dateFrom";params.put("dateFrom",Timestamp.from(from.atStartOfDay(ZONE).toInstant()));}
        if(to!=null){sql+=" and "+date+"<:dateTo";params.put("dateTo",Timestamp.from(to.plusDays(1).atStartOfDay(ZONE).toInstant()));}
        if(!equipment.isBlank()){
            sql+=" and (lower(a.name) like :equipment escape '!' or lower(a.code) like :equipment escape '!')";
            params.put("equipment","%"+equipment.strip().toLowerCase(Locale.ROOT).replace("!","!!").replace("%","!%").replace("_","!_")+"%");
        }
        if(assigneeId!=null){sql+=" and t.assigned_to_id=:assignee";params.put("assignee",assigneeId);}
        return new Query(sql,params);
    }
    private List<Row> rows(Query q,int limit,long offset){
        var params=new HashMap<>(q.params());params.put("limit",limit);params.put("offset",offset);
        return jdbc.query(q.sql()+" order by report_date desc,id desc limit :limit offset :offset",params,(r,n)->new Row(r.getLong("id"),r.getLong("ticket_id"),r.getString("ticket_no"),r.getString("title"),r.getString("asset_code"),r.getString("asset_name"),r.getString("assignee_name"),r.getTimestamp("report_date").toInstant(),r.getBigDecimal("labor_cost"),r.getBigDecimal("parts_cost"),r.getBigDecimal("total_cost")));
    }
    public Report report(User actor,Mode mode,LocalDate from,LocalDate to,String equipment,Long assigneeId,int page,int size){
        if(page<0||size<1||size>100)throw new ApiException(400,"分頁條件不正確");
        Query q=query(actor,mode,from,to,equipment,assigneeId);
        var totals=jdbc.queryForMap("select count(*) total,coalesce(sum(labor_cost),0) labor,coalesce(sum(parts_cost),0) parts,coalesce(sum(total_cost),0) amount from ("+q.sql()+") report",q.params());
        long total=((Number)totals.get("total")).longValue();
        return new Report(rows(q,size,(long)page*size),total,(total+size-1)/size,new Summary(new BigDecimal(totals.get("labor").toString()),new BigDecimal(totals.get("parts").toString()),new BigDecimal(totals.get("amount").toString())));
    }
    public byte[] export(User actor,Mode mode,LocalDate from,LocalDate to,String equipment,Long assigneeId){
        var items=rows(query(actor,mode,from,to,equipment,assigneeId),5001,0);
        if(items.size()>5000)throw new ApiException(400,"匯出上限為 5000 筆，請縮小日期範圍或篩選條件");
        var csv=new StringBuilder("\uFEFF");
        csvRow(csv,"工單編號","工單標題","設備編號","設備名稱","目前負責人",mode==Mode.RECORDED?"維修完成時間（台北）":"工單建立時間（台北）","人工費","零件費","已登錄費用");
        var time=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZONE);
        for(Row r:items)csvRow(csv,r.ticketNo(),r.title(),r.assetCode(),r.assetName(),r.assigneeName(),time.format(r.date()),amount(r.laborCost()),amount(r.partsCost()),amount(r.totalCost()));
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
    private static String amount(BigDecimal value){return value==null?"":value.toPlainString();}
    private static void csvRow(StringBuilder csv,String... values){csv.append(Arrays.stream(values).map(TicketCsv::cell).collect(Collectors.joining(","))).append("\r\n");}
}
