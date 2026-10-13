package com.taskflow.fixflow;

import java.nio.charset.StandardCharsets;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/** Excel-compatible text export; all user-provided cells are treated as text. */
public final class TicketCsv {
    private static final DateTimeFormatter TIME=DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Taipei"));
    private TicketCsv() {}
    static String cell(String value){
        String text=value==null?"":value;
        String leading=text.stripLeading();
        if(!leading.isEmpty()&&("=+-@".indexOf(leading.charAt(0))>=0)||text.startsWith("\t")||text.startsWith("\r")||text.startsWith("\n"))text="'"+text;
        return "\""+text.replace("\"","\"\"")+"\"";
    }
    private static String time(Instant value){return value==null?"":TIME.format(value);}
    private static void row(StringBuilder csv,String... fields){csv.append(Arrays.stream(fields).map(TicketCsv::cell).collect(Collectors.joining(","))).append("\r\n");}
    public static byte[] encode(List<Ticket> tickets){
        var csv=new StringBuilder("\uFEFF");
        row(csv,"工單編號","設備編號","設備名稱","標題","說明","分類","優先級","狀態","報修位置","報修者","負責技師","建立時間（臺灣）","到期時間（臺灣）","完成維修時間（臺灣）","結案時間（臺灣）","是否逾期");
        Instant now=Instant.now();
        for(Ticket t:tickets){
            String category=switch(t.category){case AIR_CONDITIONING->"空調";case NETWORK->"網路";case ELECTRICAL->"電力";case EQUIPMENT->"設備";case OTHER->"其他";};
            String priority=switch(t.priority){case LOW->"低";case MEDIUM->"中";case HIGH->"高";case CRITICAL->"緊急";};
            String status=switch(t.status){case OPEN->"待派工";case ASSIGNED->"已派工";case IN_PROGRESS->"維修中";case RESOLVED->"待確認";case CLOSED->"已結案";case CANCELLED->"已取消";};
            boolean active=switch(t.status){case OPEN,ASSIGNED,IN_PROGRESS->true;default->false;};
            row(csv,t.ticketNo,t.asset==null?"":t.asset.getCode(),t.asset==null?"":t.asset.getName(),t.title,t.description,category,priority,status,t.location,t.createdBy.getName(),t.assignedTo==null?"未指派":t.assignedTo.getName(),time(t.createdAt),time(t.dueAt),time(t.resolvedAt),time(t.closedAt),active&&now.isAfter(t.dueAt)?"是":"否");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }
}
