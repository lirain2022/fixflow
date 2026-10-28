package com.taskflow;

import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT, properties={"spring.datasource.url=jdbc:h2:mem:admin-regression;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=validate","fixflow.upload-dir=./target/test-uploads","fixflow.redis-enabled=false"})
class FixFlowIntegrationTest {
    // Internal workflow tests use explicitly provisioned ADMIN accounts. Member boundaries
    // are exercised over HTTP in MemberServiceIntegrationTest and the cases below.
    @org.junit.jupiter.api.BeforeEach void clearIsolatedWorkData() {
        for(String table:List.of("ff_notifications","ff_part_requests","ff_repair_parts","ff_attachments","ff_entries","ff_tickets","ff_assets")) reportJdbc.update("DELETE FROM "+table);
    }
    String staff(String name)throws Exception {
        String email=UUID.randomUUID()+"@example.com";
        ok("POST","/api/users",login("admin@fixflow.local"),Map.of("name",name,"email",email,"password","FixFlow123!","role","ADMIN"),201);
        return login(email);
    }
    @Test void separateLoginPortalsCheckRoles()throws Exception{
        var admin=Map.of("email","admin@fixflow.local","password","FixFlow123!");
        var member=Map.of("email","customer@fixflow.local","password","FixFlow123!");
        assertEquals("ADMIN",ok("POST","/api/auth/admin-login",null,admin,200).path("user").path("role").asText());
        assertEquals("CUSTOMER",ok("POST","/api/auth/member-login",null,member,200).path("user").path("role").asText());
        var forbidden=call("POST","/api/auth/admin-login",null,member);
        assertEquals(403,forbidden.statusCode());assertFalse(forbidden.body().contains("\"token\""));
        assertEquals(403,call("POST","/api/auth/member-login",null,admin).statusCode());
        assertEquals(401,call("POST","/api/auth/admin-login",null,Map.of("email","admin@fixflow.local","password","incorrect")).statusCode());
        assertEquals(400,call("POST","/api/auth/admin-login",null,Map.of()).statusCode());
    }
    @Test void previousStepPreservesCostsAndChecksRevisionAndVisibility()throws Exception{
        String owner=staff("Back owner"),worker=staff("Back worker"),other=register("Back outsider");
        long workerId=ok("GET","/api/users/me",worker,null,200).path("id").asLong();
        String base="/api/tickets/"+ok("POST","/api/tickets",owner,Map.of("title","Back flow","description","Fault","location","Room","category","OTHER","priority","LOW"),201).path("id").asLong();
        var open=ok("GET",base,owner,null,200);
        assertEquals(409,call("POST",base+"/previous-step",owner,Map.of("version",open.path("version").asLong())).statusCode());
        var assigned=ok("PATCH",base+"/assign",owner,Map.of("technicianId",workerId),200);
        assertEquals(400,call("POST",base+"/previous-step",owner,Map.of()).statusCode());
        assertEquals(403,call("POST",base+"/previous-step",other,Map.of("version",assigned.path("version").asLong())).statusCode());
        var started=ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
        var saved=ok("PUT",base+"/repair-draft",owner,Map.of("description","Saved work","workHours","1","laborCost","250","parts",List.of(),"version",started.path("version").asLong()),200);
        assertEquals(409,call("POST",base+"/previous-step",owner,Map.of("version",started.path("version").asLong())).statusCode());
        var back=ok("POST",base+"/previous-step",worker,Map.of("version",saved.path("version").asLong()),200);
        assertEquals("ASSIGNED",back.path("status").asText());assertEquals(workerId,back.path("assignedTo").path("id").asLong());assertTrue(back.path("startedAt").isNull());assertEquals(250,back.path("repairDraft").path("totalCost").asInt());
        assertEquals(409,call("POST",base+"/previous-step",worker,Map.of("version",saved.path("version").asLong())).statusCode());
        back=ok("POST",base+"/previous-step",owner,Map.of("version",back.path("version").asLong()),200);
        assertEquals("OPEN",back.path("status").asText());assertTrue(back.path("assignedTo").isNull());assertEquals(250,back.path("repairDraft").path("totalCost").asInt());
        assertEquals(0,back.path("repairCostSummary").path("recordedTotal").asInt());
        ok("PATCH",base+"/assign",owner,Map.of("technicianId",workerId),200);started=ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
        var repaired=ok("POST",base+"/repair-records",owner,Map.of("description","Fixed","workHours","1","laborCost","250","parts",List.of(),"version",started.path("version").asLong()),201);
        assertEquals(409,call("POST",base+"/previous-step",owner,Map.of("version",repaired.path("version").asLong())).statusCode());
        var rework=ok("POST",base+"/rework",owner,Map.of("reason","Check again"),200);
        back=ok("POST",base+"/previous-step",owner,Map.of("version",rework.path("version").asLong()),200);
        assertEquals(1,back.path("repairs").size());assertEquals(250,back.path("repairCostSummary").path("recordedTotal").asInt());
        var cancelled=ok("PATCH",base+"/status",owner,Map.of("status","CANCELLED"),200);
        assertEquals(409,call("POST",base+"/previous-step",owner,Map.of("version",cancelled.path("version").asLong())).statusCode());
    }

    @Test void unlinkedClosedCostsCanBeReconciledIntoEquipmentHistory()throws Exception{
        String owner=staff("Unlinked owner"),other=register("Unlinked outsider");
        long ownerId=ok("GET","/api/users/me",owner,null,200).path("id").asLong();
        String base="/api/tickets/"+ok("POST","/api/tickets",owner,Map.of("title","Unlinked repair","description","Fault","location","Room","category","OTHER","priority","LOW"),201).path("id").asLong();
        ok("PATCH",base+"/assign",owner,Map.of("technicianId",ownerId),200);ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
        ok("POST",base+"/repair-records",owner,Map.of("description","Fixed","workHours","1","laborCost","350"),201);
        var closed=ok("PATCH",base+"/status",owner,Map.of("status","CLOSED"),200);
        closed=ok("GET",base,owner,null,200);
        var unlinked=ok("GET","/api/tickets/unlinked-assets?size=1",owner,null,200);assertEquals(1,unlinked.path("total").asInt());assertEquals(350,unlinked.path("items").get(0).path("repairCostSummary").path("recordedTotal").asInt());
        assertEquals(403,call("GET","/api/tickets/unlinked-assets",other,null).statusCode());
        var asset=ok("POST","/api/assets",owner,Map.of("code","LINK-"+UUID.randomUUID().toString().substring(0,8),"name","Forgotten pump","location","Room","category","OTHER","enabled",true),201);
        var body=Map.of("assetId",asset.path("id").asLong(),"version",closed.path("version").asLong());
        assertEquals(403,call("PATCH",base+"/asset",other,body).statusCode());
        assertEquals(409,call("PATCH",base+"/asset",owner,Map.of("assetId",asset.path("id").asLong(),"version",0)).statusCode());
        var linked=ok("PATCH",base+"/asset",owner,body,200);assertEquals("CLOSED",linked.path("status").asText());assertEquals(closed.path("closedAt"),linked.path("closedAt"));assertEquals(closed.path("repairs"),linked.path("repairs"));
        assertEquals(0,ok("GET","/api/tickets/unlinked-assets",owner,null,200).path("total").asInt());
        var history=ok("GET","/api/assets/"+asset.path("id").asLong()+"/tickets",owner,null,200);assertEquals(1,history.path("total").asInt());assertEquals(350,history.path("maintenanceSummary").path("totalCost").asInt());
        assertEquals(409,call("PATCH",base+"/asset",owner,Map.of("assetId",asset.path("id").asLong(),"version",linked.path("version").asLong())).statusCode());
        assertEquals(400,call("GET","/api/tickets/unlinked-assets?size=101",owner,null).statusCode());
    }
    @Test void administratorsCanManageTheWholeWorkflow()throws Exception{
        String owner=staff("Unified owner"),worker=staff("Unified worker"),stranger=register("Unrelated");
        long workerId=ok("GET","/api/users/me",worker,null,200).path("id").asLong();
        var assetInput=new HashMap<String,Object>(Map.of("code","UNI-"+UUID.randomUUID().toString().substring(0,8),"name","Pump","location","B1","category","OTHER","enabled",true));
        var asset=ok("POST","/api/assets",owner,assetInput,201);assetInput.put("version",asset.path("version").asLong());assetInput.put("name","Updated pump");ok("PUT","/api/assets/"+asset.path("id").asLong(),worker,assetInput,200);
        var input=new HashMap<String,Object>(Map.of("title","Single account","description","Fault","location","B1","category","OTHER","priority","LOW","assetId",asset.path("id").asLong()));
        String base="/api/tickets/"+ok("POST","/api/tickets",owner,input,201).path("id").asLong();
        var assigned=ok("PATCH",base+"/assign",owner,Map.of("technicianId",workerId),200);
        input.put("version",assigned.path("version").asLong());ok("PUT",base,worker,input,200);
        assertEquals(403,call("PATCH",base+"/status",stranger,Map.of("status","IN_PROGRESS")).statusCode());
        var started=ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
        assertEquals(workerId,started.path("assignedTo").path("id").asLong());
        var costs=new HashMap<String,Object>(Map.of("description","Fixed","workHours","1","laborCost","100","parts",List.of(),"version",started.path("version").asLong()));
        var saved=ok("PUT",base+"/repair-draft",owner,costs,200);costs.put("version",saved.path("version").asLong());
        ok("POST",base+"/repair-records",owner,costs,201);
        ok("POST",base+"/rework",worker,Map.of("reason","Check again"),200);
        started=ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);costs.put("version",started.path("version").asLong());
        ok("POST",base+"/repair-records",owner,costs,201);
        assertEquals("CLOSED",ok("PATCH",base+"/status",worker,Map.of("status","CLOSED"),200).path("status").asText());
        assertEquals(403,call("GET","/api/users",stranger,null).statusCode());
        assertEquals(403,call("PATCH","/api/users/"+workerId,stranger,Map.of("enabled",false)).statusCode());
        assertEquals(403,call("GET",base,stranger,null).statusCode());
    }
    @Test void repairDraftPersistsWithoutCompletingOrDoubleCounting()throws Exception{
        String owner=staff("Draft owner"),worker=staff("Draft worker"),other=register("Draft outsider");
        long workerId=ok("GET","/api/users/me",worker,null,200).path("id").asLong();
        String base="/api/tickets/"+ok("POST","/api/tickets",owner,Map.of("title","Draft costs","description","Fault","location","Room","category","OTHER","priority","LOW"),201).path("id").asLong();
        ok("PATCH",base+"/assign",owner,Map.of("technicianId",workerId),200);
        var draft=Map.of("description","","workHours","0","laborCost","250","parts",List.of(Map.of("name","Seal","quantity",2,"unitPrice","10")),"version",ok("GET",base,worker,null,200).path("version").asLong());
        assertEquals(409,call("PUT",base+"/repair-draft",worker,draft).statusCode());
        var started=ok("PATCH",base+"/status",worker,Map.of("status","IN_PROGRESS"),200);
        var body=new HashMap<String,Object>(draft);body.put("version",started.path("version").asLong());
        assertEquals(403,call("PUT",base+"/repair-draft",other,body).statusCode());
        assertEquals(403,call("PUT",base+"/repair-draft",other,body).statusCode());
        var saved=ok("PUT",base+"/repair-draft",worker,body,200);
        assertEquals("IN_PROGRESS",saved.path("status").asText());assertEquals(270,saved.path("repairDraft").path("totalCost").asInt());
        assertEquals(0,saved.path("repairs").size());assertEquals(0,saved.path("repairCostSummary").path("recordedTotal").asInt());
        assertEquals(409,call("PUT",base+"/repair-draft",worker,body).statusCode());
        assertEquals(270,ok("GET",base,owner,null,200).path("repairDraft").path("totalCost").asInt());
        body.put("version",saved.path("version").asLong());body.put("laborCost","300");
        saved=ok("PUT",base+"/repair-draft",worker,body,200);assertEquals(320,saved.path("repairDraft").path("totalCost").asInt());
        body.put("description","Fixed");body.put("version",saved.path("version").asLong());
        var done=ok("POST",base+"/repair-records",worker,body,201);
        assertTrue(done.path("repairDraft").isNull());assertEquals(1,done.path("repairs").size());assertEquals(320,done.path("repairCostSummary").path("recordedTotal").asInt());
        assertEquals(409,call("PUT",base+"/repair-draft",worker,body).statusCode());
    }
    @Test void personalQueuesFilterBeforePaginationAndExport()throws Exception{
        String owner=staff("Queue owner"),worker=staff("Queue worker"),stranger=register("Queue stranger");
        long workerId=ok("GET","/api/users/me",worker,null,200).path("id").asLong();
        var body=Map.of("title","Queue work","description","Details","location","Room","category","OTHER","priority","LOW");
        long own=ok("POST","/api/tickets",worker,body,201).path("id").asLong();
        var received=ok("POST","/api/tickets",owner,body,201);String base="/api/tickets/"+received.path("id").asLong();
        ok("PATCH",base+"/assign",owner,Map.of("technicianId",workerId),200);
        assertEquals(1,ok("GET","/api/tickets?scope=CREATED&size=1",worker,null,200).path("total").asInt());
        assertEquals(own,ok("GET","/api/tickets?scope=CREATED",worker,null,200).path("items").get(0).path("id").asLong());
        assertEquals(1,ok("GET","/api/tickets?scope=ASSIGNED",worker,null,200).path("total").asInt());
        assertEquals(2,ok("GET","/api/tickets?scope=ACTION_REQUIRED&size=1",worker,null,200).path("total").asInt());
        assertEquals(2,ok("GET","/api/tickets?scope=ACTION_REQUIRED",owner,null,200).path("total").asInt());
        assertEquals(403,call("GET","/api/tickets?scope=ASSIGNED&assigneeId="+workerId,stranger,null).statusCode());
        String csv=call("GET","/api/tickets/export?scope=ASSIGNED",worker,null).body();assertTrue(csv.contains(received.path("ticketNo").asText()));assertFalse(csv.contains(ok("GET","/api/tickets/"+own,worker,null,200).path("ticketNo").asText()));
        ok("PATCH",base+"/status",worker,Map.of("status","IN_PROGRESS"),200);ok("POST",base+"/repair-records",worker,Map.of("description","Fixed"),201);
        assertEquals(2,ok("GET","/api/tickets?scope=ACTION_REQUIRED",owner,null,200).path("total").asInt());
        assertEquals(2,ok("GET","/api/tickets?scope=ACTION_REQUIRED",worker,null,200).path("total").asInt());
        ok("PATCH",base+"/status",owner,Map.of("status","CLOSED"),200);
        assertEquals(1,ok("GET","/api/tickets?scope=ACTION_REQUIRED",owner,null,200).path("total").asInt());
        assertEquals(400,call("GET","/api/tickets?scope=INVALID",worker,null).statusCode());
    }

    @Test void assignedMembersCannotReadOthersReportsOrNotifications()throws Exception{
 String owner=register("Owner"),worker=register("Legacy assignee"),outsider=register("Outsider"),admin=login("admin@fixflow.local");
 long workerId=ok("GET","/api/users/me",worker,null,200).path("id").asLong();
 long id=ok("POST","/api/member/tickets",owner,Map.of("title","Private report","description","Problem","location","Room","category","OTHER","priority","LOW"),201).path("id").asLong();String base="/api/tickets/"+id,member="/api/member/tickets/"+id;
 ok("PATCH",base+"/assign",admin,Map.of("technicianId",workerId),200);
 assertEquals(404,call("GET",member,worker,null).statusCode());assertEquals(0,ok("GET","/api/member/notifications",worker,null,200).path("total").asInt());assertEquals(0,ok("GET","/api/member/tickets?scope=ASSIGNED",worker,null,200).path("total").asInt());
 assertEquals(403,call("PATCH",base+"/status",worker,Map.of("status","IN_PROGRESS")).statusCode());
 ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);ok("POST",base+"/repair-records",admin,Map.of("description","Fixed","workHours","1","laborCost","0"),201);
 assertEquals(404,call("POST",member+"/rework",outsider,Map.of("reason","Not mine")).statusCode());ok("POST",member+"/rework",owner,Map.of("reason","Needs adjustment"),200);
 ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);ok("POST",base+"/repair-records",admin,Map.of("description","Adjusted"),201);ok("POST",member+"/accept",owner,Map.of(),200);
 }
    @Test void registrationDoesNotGrantDispatchRights()throws Exception{
        String owner=register("Self dispatch"),other=register("Other owner"),tech=login("tech@fixflow.local"),admin=login("admin@fixflow.local");
        long techId=ok("GET","/api/users/me",tech,null,200).path("id").asLong();
        var body=Map.of("title","Self dispatch","description","Details","location","Room","category","OTHER","priority","LOW");
        long id=ok("POST","/api/member/tickets",owner,body,201).path("id").asLong();long otherId=ok("POST","/api/member/tickets",other,body,201).path("id").asLong();
        assertEquals(403,call("PATCH","/api/tickets/"+id+"/assign",owner,Map.of("technicianId",techId)).statusCode());
        var assignment=Map.of("technicianId",techId,"expectedStatus","OPEN");
        assertEquals(403,call("GET","/api/workspace/technicians",owner,null).statusCode());assertEquals(403,call("GET","/api/users/technicians",owner,null).statusCode());
        assertEquals(403,call("GET","/api/users",owner,null).statusCode());
        assertEquals(403,call("PATCH","/api/tickets/"+otherId+"/assign",owner,assignment).statusCode());
        assertEquals("ASSIGNED",ok("PATCH","/api/tickets/"+id+"/assign",admin,assignment,200).path("status").asText());
        assertEquals("ASSIGNED",ok("PATCH","/api/tickets/"+otherId+"/assign",admin,assignment,200).path("status").asText());
        assertEquals(1,ok("GET","/api/member/tickets?scope=ALL",owner,null,200).path("total").asInt());
        assertEquals("CUSTOMER",ok("GET","/api/users/me",owner,null,200).path("role").asText());
    }
    @Test void assetCostsAreScopedAcrossAllPagesAndPreserveReworkAndUnknownCosts()throws Exception{
        String admin=login("admin@fixflow.local"),owner=staff("Asset cost owner"),other=staff("Asset outsider"),tech=login("tech@fixflow.local");
        long techId=ok("GET","/api/users/me",admin,null,200).path("id").asLong();
        long asset=ok("POST","/api/assets",admin,Map.of("code","COST-"+UUID.randomUUID().toString().substring(0,8),"name","Cost equipment","location","Lab","category","OTHER","enabled",true),201).path("id").asLong();
        String path="/api/assets/"+asset+"/tickets?size=1";
        assertEquals(401,call("GET",path,null,null).statusCode());
        var empty=ok("GET",path,owner,null,200).path("maintenanceSummary");assertEquals(0,empty.path("reportCount").asInt());assertTrue(empty.path("lastRepairAt").isNull());
        for(int i=0;i<3;i++){
            String who=i==2?other:owner;
            var created=ok("POST","/api/tickets",who,Map.of("title","Equipment issue "+i,"description","Fault details","location","Lab","category","OTHER","priority","LOW","assetId",asset),201);
            String base="/api/tickets/"+created.path("id").asLong();
            if(i==1){ok("PATCH",base+"/status",owner,Map.of("status","CANCELLED"),200);continue;}
            ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200);ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
            ok("POST",base+"/repair-records",admin,Map.of("description","Replaced connector","workHours","1.25","laborCost",i==0?"10.10":"1000","parts",List.of(Map.of("name","Connector","quantity",2,"unitPrice","0.15"))),201);
            if(i==0){
                ok("POST",base+"/rework",owner,Map.of("reason","Adjust"),200);ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
                ok("POST",base+"/repair-records",admin,Map.of("description","Legacy repair"),201);
                ok("POST",base+"/rework",owner,Map.of("reason","Final adjustment"),200);
            }
        }
        var history=ok("GET",path,owner,null,200);var summary=history.path("maintenanceSummary");
        assertEquals(3,history.path("total").asInt());assertEquals(1,history.path("items").size());
        assertEquals(2,summary.path("reportCount").asInt());assertEquals(1,summary.path("cancelledCount").asInt());
        assertEquals(2,summary.path("recordedRepairs").asInt());assertEquals(1,summary.path("unpricedRepairs").asInt());
        assertEquals(0,new java.math.BigDecimal("1010.70").compareTo(summary.path("totalCost").decimalValue()));
        assertEquals(0,new java.math.BigDecimal("0.60").compareTo(summary.path("partsCost").decimalValue()));assertFalse(summary.path("lastRepairAt").isNull());
        assertEquals(summary,ok("GET",path+"&page=1",owner,null,200).path("maintenanceSummary"));
        var all=ok("GET",path,admin,null,200).path("maintenanceSummary");assertEquals(2,all.path("reportCount").asInt());
        assertEquals(0,new java.math.BigDecimal("1010.70").compareTo(all.path("totalCost").decimalValue()));
        var technicianSummary=ok("GET",path,admin,null,200).path("maintenanceSummary");assertEquals(all.path("totalCost"),technicianSummary.path("totalCost"));assertEquals(1,technicianSummary.path("cancelledCount").asInt());
        String stranger=register("No equipment history");assertEquals(403,call("GET",path,stranger,null).statusCode());
    }
    @Test void repairCostsUseExactServerTotalsAndPreserveEveryRepairRound()throws Exception{
        String owner=staff("Cost owner"),other=register("Cost outsider"),admin=login("admin@fixflow.local"),tech=login("tech@fixflow.local");
        long techId=ok("GET","/api/users/me",admin,null,200).path("id").asLong();
        var ticket=ok("POST","/api/tickets",owner,Map.of("title","Repair costs","description","Details","location","Room","category","OTHER","priority","LOW"),201);String base="/api/tickets/"+ticket.path("id").asLong();
        ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200);ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        var input=new HashMap<String,Object>(Map.of("description","Replaced parts","workHours","1.50","laborCost","500.25","parts",List.of(Map.of("name","Connector","quantity",2,"unitPrice","12.30"),Map.of("name","Seal","quantity",3,"unitPrice","0.10")),"totalCost","0.01"));
        assertEquals(403,call("POST",base+"/repair-records",other,input).statusCode());assertEquals(403,call("POST",base+"/repair-records",other,input).statusCode());
        var invalid=new HashMap<>(input);invalid.put("workHours","-1");assertEquals(400,call("POST",base+"/repair-records",admin,invalid).statusCode());
        invalid=new HashMap<>(input);invalid.put("laborCost","0.001");assertEquals(400,call("POST",base+"/repair-records",admin,invalid).statusCode());
        invalid=new HashMap<>(input);invalid.remove("laborCost");assertEquals(400,call("POST",base+"/repair-records",admin,invalid).statusCode());
        invalid=new HashMap<>(input);invalid.put("parts",List.of(Map.of("name","Invalid","quantity",0,"unitPrice","10")));assertEquals(400,call("POST",base+"/repair-records",admin,invalid).statusCode());
        invalid=new HashMap<>(input);invalid.put("parts",List.of(Map.of("name","Fractional","quantity",new java.math.BigDecimal("1.9"),"unitPrice","10")));assertEquals(400,call("POST",base+"/repair-records",admin,invalid).statusCode());
        invalid=new HashMap<>(input);invalid.put("parts",Collections.nCopies(51,Map.of("name","Too many","quantity",1,"unitPrice","10")));assertEquals(400,call("POST",base+"/repair-records",admin,invalid).statusCode());
        var untouched=ok("GET",base,owner,null,200);assertEquals("IN_PROGRESS",untouched.path("status").asText());assertEquals(0,untouched.path("repairs").size());
        var resolved=ok("POST",base+"/repair-records",admin,input,201);var repair=resolved.path("repairs").get(0);
        assertEquals(0,new java.math.BigDecimal("525.15").compareTo(repair.path("totalCost").decimalValue()));assertEquals(0,new java.math.BigDecimal("24.90").compareTo(repair.path("partsCost").decimalValue()));
        assertEquals(0,new java.math.BigDecimal("1.50").compareTo(repair.path("workHours").decimalValue()));assertEquals(2,repair.path("parts").size());assertEquals("Connector",repair.path("parts").get(0).path("name").asText());
        assertEquals(409,call("POST",base+"/repair-records",admin,input).statusCode());
        ok("POST",base+"/rework",owner,Map.of("reason","Needs adjustment"),200);ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        var second=ok("POST",base+"/repair-records",admin,Map.of("description","Adjustment","workHours","0.25","laborCost","0","parts",List.of()),201);
        assertEquals(2,second.path("repairs").size());assertEquals(0,new java.math.BigDecimal("525.15").compareTo(second.path("repairCostSummary").path("recordedTotal").decimalValue()));assertEquals(2,second.path("repairCostSummary").path("recordedRepairs").asInt());
        ok("POST",base+"/rework",owner,Map.of("reason","Legacy client repair"),200);ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        var legacy=ok("POST",base+"/repair-records",admin,Map.of("description","Old client without fee fields"),201);
        assertTrue(legacy.path("repairs").get(2).path("totalCost").isNull());assertEquals(1,legacy.path("repairCostSummary").path("unpricedRepairs").asInt());
        assertEquals(0,new java.math.BigDecimal("525.15").compareTo(ok("GET",base,owner,null,200).path("repairCostSummary").path("recordedTotal").decimalValue()));
    }
    @Test void notificationsArePersistentPrivateAndFollowCurrentTicketVisibility()throws Exception{
 String admin=login("admin@fixflow.local"),owner=register("Notification owner"),other=register("Notification outsider"),tech=login("tech@fixflow.local");
 assertEquals(401,call("GET","/api/member/notifications",null,null).statusCode());assertEquals(400,call("GET","/api/member/notifications?size=101",owner,null).statusCode());
 long id=ok("POST","/api/member/tickets",owner,Map.of("title","Notification ticket","description","Private notes","location","Room","category","OTHER","priority","LOW"),201).path("id").asLong();String base="/api/tickets/"+id,member="/api/member/tickets/"+id;
 assertEquals(0,ok("GET","/api/member/notifications",owner,null,200).path("total").asLong());
 assertTrue(ok("GET","/api/notifications?size=100",admin,null,200).path("items").valueStream().anyMatch(n->n.path("ticketId").asLong()==id&&n.path("kind").asText().equals("CREATED")));
 long techId=ok("GET","/api/users/me",tech,null,200).path("id").asLong();ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200);
 var feed=ok("GET","/api/member/notifications",owner,null,200);assertEquals(1,feed.path("unreadCount").asLong());long notice=feed.path("items").get(0).path("id").asLong();
 assertEquals(404,call("POST","/api/member/notifications/"+notice+"/read",other,null).statusCode());
 ok("POST","/api/member/notifications/"+notice+"/read",owner,null,204);ok("POST","/api/member/notifications/"+notice+"/read",owner,null,204);
 assertEquals(0,ok("GET","/api/member/notifications",owner,null,200).path("unreadCount").asLong());assertFalse(ok("GET","/api/member/notifications",owner,null,200).path("items").get(0).path("readAt").isNull());
 ok("POST",member+"/comments",owner,Map.of("content","Please check"),200);assertEquals(0,ok("GET","/api/member/notifications",tech,null,200).path("total").asLong());
 long legacyNotice=reportJdbc.queryForObject("select max(id) from ff_notifications where recipient_id=? and ticket_id=?",Long.class,techId,id);assertEquals(404,call("POST","/api/member/notifications/"+legacyNotice+"/read",tech,null).statusCode());
 long before=ok("GET","/api/member/notifications",owner,null,200).path("total").asLong();assertEquals(409,call("POST",base+"/repair-records",admin,Map.of("description","Too early")).statusCode());assertEquals(before,ok("GET","/api/member/notifications",owner,null,200).path("total").asLong());
 ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);ok("POST",base+"/repair-records",admin,Map.of("description","Fixed"),201);assertEquals("RESOLVED",ok("GET","/api/member/notifications",owner,null,200).path("items").get(0).path("kind").asText());
 ok("PATCH","/api/notifications/read-all",admin,null,204);assertEquals(0,ok("GET","/api/notifications?unreadOnly=true",admin,null,200).path("total").asLong());
 }
    @Test void staleTicketEditsCannotOverwriteAnotherUsersChanges()throws Exception{
        String owner=staff("Edit owner"),admin=login("admin@fixflow.local"),other=register("Other editor"),tech=login("tech@fixflow.local");
        var body=new HashMap<String,Object>(Map.of("title","Original","description","Initial details","location","Room","category","OTHER","priority","LOW"));
        var created=ok("POST","/api/tickets",owner,body,201);String base="/api/tickets/"+created.path("id").asLong();
        assertTrue(created.has("version"));assertEquals(created.path("version"),ok("GET",base,owner,null,200).path("version"));
        assertEquals(409,call("PUT",base,owner,body).statusCode());
        body.put("version",created.path("version").asLong());body.put("title","First editor saved");
        var saved=ok("PUT",base,owner,body,200);assertTrue(saved.path("version").asLong()>created.path("version").asLong());
        assertEquals(saved.path("version"),ok("GET",base,owner,null,200).path("version"));
        body.put("title","Stale editor overwrite");assertEquals(409,call("PUT",base,admin,body).statusCode());
        assertEquals("First editor saved",ok("GET",base,owner,null,200).path("title").asText());
        assertEquals(403,call("PUT",base,other,body).statusCode());assertEquals(403,call("PUT",base,tech,body).statusCode());
        body.put("version",saved.path("version").asLong());var latest=ok("PUT",base,admin,body,200);
        long techId=ok("GET","/api/users/me",tech,null,200).path("id").asLong();
        ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200);
        body.put("version",latest.path("version").asLong());assertEquals(409,call("PUT",base,owner,body).statusCode());
        body.put("version",ok("GET",base,owner,null,200).path("version").asLong());assertEquals(200,call("PUT",base,owner,body).statusCode());
    }
    @Test void passwordChangeRevokesEveryOldSessionAndRequiresCurrentPassword()throws Exception{
        String email="password-"+UUID.randomUUID()+"@example.com",oldPassword="Original123!",newPassword="Updated456!";
        var session=ok("POST","/api/auth/register",null,Map.of("name","Password test","email",email,"password",oldPassword),201);String first=session.path("token").asText();
        String second=ok("POST","/api/auth/login",null,Map.of("email",email,"password",oldPassword),200).path("token").asText();
        String endpoint="/api/users/me/password";
        assertEquals(401,call("POST",endpoint,null,Map.of("currentPassword",oldPassword,"newPassword",newPassword)).statusCode());
        assertEquals(400,call("POST",endpoint,first,Map.of("currentPassword","wrong","newPassword",newPassword)).statusCode());
        assertEquals(200,call("GET","/api/users/me",first,null).statusCode());
        assertEquals(400,call("POST",endpoint,first,Map.of("currentPassword",oldPassword,"newPassword","short")).statusCode());
        assertEquals(400,call("POST",endpoint,first,Map.of("currentPassword",oldPassword,"newPassword",oldPassword)).statusCode());
        assertEquals(400,call("POST",endpoint,first,Map.of("currentPassword",oldPassword,"newPassword","密".repeat(25))).statusCode());
        assertEquals(204,call("POST",endpoint,first,Map.of("currentPassword",oldPassword,"newPassword",newPassword)).statusCode());
        assertEquals(401,call("GET","/api/users/me",first,null).statusCode());assertEquals(401,call("GET","/api/users/me",second,null).statusCode());
        assertEquals(401,call("POST","/api/auth/login",null,Map.of("email",email,"password",oldPassword)).statusCode());
        var fresh=ok("POST","/api/auth/login",null,Map.of("email",email,"password",newPassword),200);assertFalse(fresh.path("user").has("passwordHash"));
        assertEquals(200,call("GET","/api/users/me",fresh.path("token").asText(),null).statusCode());
    }
    @Test void equipmentRetirementCannotRaceNewRepair()throws Exception{
        String admin=login("admin@fixflow.local"),owner=staff("Concurrent asset owner");
        var input=new HashMap<String,Object>(Map.of("code","RACE-"+UUID.randomUUID().toString().substring(0,8),"name","Race asset","location","Room","category","OTHER","enabled",true));
        var asset=ok("POST","/api/assets",owner,input,201);long id=asset.path("id").asLong();input.put("version",asset.path("version").asLong());input.put("enabled",false);
        var gate=new java.util.concurrent.CountDownLatch(1);
        var retire=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{gate.await();return call("PUT","/api/assets/"+id,admin,input).statusCode();}catch(Exception e){throw new java.util.concurrent.CompletionException(e);}});
        var repair=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{gate.await();return call("POST","/api/tickets",owner,Map.of("title","Race repair","description","Details","location","Room","category","OTHER","priority","LOW","assetId",id)).statusCode();}catch(Exception e){throw new java.util.concurrent.CompletionException(e);}});
        gate.countDown();int retired=retire.get(30,java.util.concurrent.TimeUnit.SECONDS),created=repair.get(30,java.util.concurrent.TimeUnit.SECONDS);
        assertTrue((retired==200&&created==400)||(retired==409&&created==201),"retire="+retired+", create="+created);
        var current=ok("GET","/api/assets/"+id,admin,null,200);
        assertEquals(created==201,current.path("enabled").asBoolean());
    }
    @Test void assetsLinkTicketsAndKeepHistoryWithinRoleScope()throws Exception{
        String admin=login("admin@fixflow.local"),owner=staff("Asset owner"),other=staff("Asset other"),tech=login("tech@fixflow.local");
        String code="ac-"+UUID.randomUUID().toString().substring(0,8);
        Map<String,Object> input=new HashMap<>(Map.of("code",code,"name","會議室冷氣","location","3F","model","AC-100","category","AIR_CONDITIONING","warrantyUntil","2028-12-31","enabled",true));
        assertEquals(401,call("GET","/api/assets",null,null).statusCode());
        assertEquals(401,call("POST","/api/assets",null,input).statusCode());
        var asset=ok("POST","/api/assets",admin,input,201);long assetId=asset.path("id").asLong();String base="/api/assets/"+assetId;
        assertEquals(code.toUpperCase(Locale.ROOT),asset.path("code").asText());assertEquals("ACTIVE",asset.path("status").asText());
        assertEquals(409,call("POST","/api/assets",admin,input).statusCode());
        assertEquals(1,ok("GET","/api/assets?query="+code,owner,null,200).path("total").asLong());
        input.put("version",asset.path("version").asLong());input.put("name","會議室冷氣更新");
        assertEquals(401,call("PUT",base,null,input).statusCode());
        var updated=ok("PUT",base,admin,input,200);
        assertEquals(409,call("PUT",base,admin,input).statusCode());
        input.put("version",updated.path("version").asLong());
        var body=new HashMap<String,Object>(Map.of("title","Asset repair","description","Leak","location","3F original","category","AIR_CONDITIONING","priority","HIGH","assetId",assetId));
        var own=ok("POST","/api/tickets",owner,body,201);long ticketId=own.path("id").asLong();String ticketBase="/api/tickets/"+ticketId;
        var unrelated=ok("POST","/api/tickets",other,body,201);
        assertEquals(assetId,own.path("asset").path("id").asLong());
        assertEquals("MAINTENANCE",ok("GET",base,owner,null,200).path("status").asText());
        assertEquals(2,ok("GET",base+"/tickets",owner,null,200).path("total").asLong());
        assertEquals(2,ok("GET",base+"/tickets",admin,null,200).path("total").asLong());
        assertEquals(2,ok("GET",base+"/tickets?size=1",admin,null,200).path("totalPages").asLong());
        input.put("enabled",false);assertEquals(409,call("PUT",base,admin,input).statusCode());
        input.put("enabled",true);input.put("location","4F moved");updated=ok("PUT",base,admin,input,200);input.put("version",updated.path("version").asLong());
        assertEquals("3F original",ok("GET",ticketBase,owner,null,200).path("location").asText());
        long techId=ok("GET","/api/users/me",admin,null,200).path("id").asLong();
        ok("PATCH",ticketBase+"/assign",admin,Map.of("technicianId",techId),200);
        assertEquals(2,ok("GET",base+"/tickets",admin,null,200).path("total").asLong());
        ok("PATCH",ticketBase+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        ok("POST",ticketBase+"/repair-records",admin,Map.of("description","Fixed"),201);
        input.put("enabled",false);assertEquals(409,call("PUT",base,admin,input).statusCode());
        ok("PATCH",ticketBase+"/status",owner,Map.of("status","CLOSED"),200);
        ok("PATCH","/api/tickets/"+unrelated.path("id").asLong()+"/status",other,Map.of("status","CANCELLED"),200);
        assertEquals("ACTIVE",ok("GET",base,admin,null,200).path("status").asText());
        updated=ok("PUT",base,admin,input,200);assertEquals("RETIRED",updated.path("status").asText());
        assertEquals(0,ok("GET","/api/assets?enabledOnly=true&query="+code,owner,null,200).path("total").asLong());
        assertEquals(2,ok("GET",base+"/tickets",owner,null,200).path("total").asLong());
        assertEquals(400,call("POST","/api/tickets",owner,body).statusCode());
        body.remove("assetId");assertTrue(ok("POST","/api/tickets",owner,body,201).path("asset").isNull());
        assertTrue(call("GET","/api/tickets/export",owner,null).body().contains(code.toUpperCase(Locale.ROOT)));
        assertEquals(400,call("GET","/api/assets?size=101",owner,null).statusCode());
    }
    @Test void acceptanceCanReturnForReworkWithoutLosingRepairHistory()throws Exception{
        String owner=staff("Rework owner"),other=register("Rework other"),admin=login("admin@fixflow.local");
        String email="rework-"+UUID.randomUUID()+"@example.com";
        long techId=ok("POST","/api/users",admin,Map.of("name","Rework technician","email",email,"password","FixFlow123!","role","TECHNICIAN"),201).path("id").asLong();
        String tech=login(email);
        var original=ok("POST","/api/tickets",owner,Map.of("title","Still leaking","description","Leak","category","OTHER","priority","HIGH","location","Room"),201);
        String base="/api/tickets/"+original.path("id").asLong();
        assertEquals(409,call("POST",base+"/rework",owner,Map.of("reason","Not finished" )).statusCode());
        ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200);
        ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        ok("POST",base+"/repair-records",admin,Map.of("description","First attempt"),201);
        assertEquals(403,call("POST",base+"/rework",other,Map.of("reason","Not mine")).statusCode());
        assertEquals(403,call("POST",base+"/rework",other,Map.of("reason","Not related")).statusCode());
        assertEquals(400,call("POST",base+"/rework",owner,Map.of("reason","  ")).statusCode());
        assertEquals(400,call("POST",base+"/rework",owner,Map.of("reason","x".repeat(4001))).statusCode());
        var beforeReturn=ok("GET",base,owner,null,200);
        var returned=ok("POST",base+"/rework",owner,Map.of("reason","Still leaking after testing"),200);
        assertEquals("ASSIGNED",returned.path("status").asText());assertEquals(techId,returned.path("assignedTo").path("id").asLong());
        assertEquals(beforeReturn.path("dueAt"),returned.path("dueAt"));assertTrue(returned.path("resolvedAt").isNull());assertTrue(returned.path("startedAt").isNull());
        assertEquals(1,ok("GET","/api/workspace/summary",admin,null,200).path("byStatus").path("ASSIGNED").asLong());
        assertEquals(1,returned.path("repairs").size());assertEquals("Still leaking after testing",returned.path("reworkRequests").get(0).path("content").asText());
        assertEquals(409,call("POST",base+"/rework",owner,Map.of("reason","Duplicate")).statusCode());
        assertEquals(409,call("PATCH","/api/users/"+techId,admin,Map.of("enabled",false)).statusCode());
        ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        ok("POST",base+"/repair-records",admin,Map.of("description","Second attempt"),201);
        ok("PATCH","/api/users/"+techId,admin,Map.of("enabled",false),200);
        var unassigned=ok("POST",base+"/rework",admin,Map.of("reason","Need another technician"),200);
        assertEquals("OPEN",unassigned.path("status").asText());assertTrue(unassigned.path("assignedTo").isNull());
        assertEquals(2,unassigned.path("repairs").size());assertEquals(2,unassigned.path("reworkRequests").size());
        long replacement=ok("GET","/api/users/me",login("tech@fixflow.local"),null,200).path("id").asLong();
        ok("PATCH",base+"/assign",admin,Map.of("technicianId",replacement),200);
        String replacementToken=login("tech@fixflow.local");
        ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        ok("POST",base+"/repair-records",admin,Map.of("description","Final fix"),201);
        var closed=ok("PATCH",base+"/status",owner,Map.of("status","CLOSED"),200);
        assertEquals(3,closed.path("repairs").size());assertEquals(2,closed.path("reworkRequests").size());
        assertEquals(409,call("POST",base+"/rework",owner,Map.of("reason","Closed already")).statusCode());
    }
    @Test void sortingUsesBusinessPriorityAndMatchesCsvAcrossPages()throws Exception{
        String owner=staff("Sort owner");
        List<Long> ids=new ArrayList<>();List<String> numbers=new ArrayList<>();
        for(String priority:List.of("LOW","CRITICAL","HIGH","MEDIUM")){
            var item=ok("POST","/api/tickets",owner,Map.of("title","Order "+priority,"description","Details","category","OTHER","priority",priority,"location","Room"),201);
            ids.add(item.path("id").asLong());numbers.add(item.path("ticketNo").asText());
        }
        var ordered=ok("GET","/api/tickets?order=PRIORITY&size=2",owner,null,200);
        assertEquals(ids.get(1).longValue(),ordered.path("items").get(0).path("id").asLong());assertEquals(ids.get(2).longValue(),ordered.path("items").get(1).path("id").asLong());
        assertEquals(ids.get(3).longValue(),ok("GET","/api/tickets?order=PRIORITY&page=1&size=2",owner,null,200).path("items").get(0).path("id").asLong());
        assertEquals(ids.get(0).longValue(),ok("GET","/api/tickets?order=OLDEST",owner,null,200).path("items").get(0).path("id").asLong());
        assertEquals(ids.get(3).longValue(),ok("GET","/api/tickets",owner,null,200).path("items").get(0).path("id").asLong());
        var earliest=workspaceTickets.findById(ids.get(0)).orElseThrow();earliest.dueAt=java.time.Instant.now().minusSeconds(60);workspaceTickets.saveAndFlush(earliest);
        assertEquals(ids.get(0).longValue(),ok("GET","/api/tickets?order=DUE_SOON",owner,null,200).path("items").get(0).path("id").asLong());
        String csv=call("GET","/api/tickets/export?order=PRIORITY",owner,null).body();
        assertTrue(csv.indexOf(numbers.get(1))<csv.indexOf(numbers.get(2)));assertTrue(csv.indexOf(numbers.get(2))<csv.indexOf(numbers.get(3)));assertTrue(csv.indexOf(numbers.get(3))<csv.indexOf(numbers.get(0)));
        assertEquals(400,call("GET","/api/tickets?order=description",owner,null).statusCode());
    }
    @Test void filteredExportRespectsVisibilityAndIncludesEveryPage()throws Exception{
        String owner=staff("Export owner"),other=register("Export other"),admin=login("admin@fixflow.local"),tech=login("tech@fixflow.local");
        long techId=ok("GET","/api/users/me",tech,null,200).path("id").asLong();
        String marker="export-"+UUID.randomUUID();
        for(int i=0;i<11;i++)ok("POST","/api/tickets",owner,Map.of("title",marker+" "+i,"description","Details","category","OTHER","priority","LOW","location","Room"),201);
        var selected=ok("POST","/api/tickets",owner,Map.of("title","=1+1,"+marker,"description","Quoted \"text\"\nnext line","category","NETWORK","priority","HIGH","location","Room"),201);
        long id=selected.path("id").asLong();
        ok("PATCH","/api/tickets/"+id+"/assign",admin,Map.of("technicianId",techId),200);
        var hidden=ok("POST","/api/member/tickets",other,Map.of("title",marker+" secret","description","Other owner","category","OTHER","priority","HIGH","location","Room"),201);
        String filters="?query="+marker+"&priority=HIGH&assigneeId="+techId+"&status=ASSIGNED";
        var list=ok("GET","/api/tickets"+filters,owner,null,200);
        assertEquals(1,list.path("total").asLong());assertEquals(id,list.path("items").get(0).path("id").asLong());
        assertEquals(403,call("GET","/api/tickets"+filters,other,null).statusCode());
        assertEquals(0,ok("GET","/api/tickets"+filters.replace("HIGH","LOW"),owner,null,200).path("total").asLong());
        assertEquals(0,ok("GET","/api/tickets?query="+marker+"&assigneeId=999999999",owner,null,200).path("total").asLong());
        var exported=call("GET","/api/tickets/export"+filters,owner,null);
        assertEquals(200,exported.statusCode(),exported.body());
        assertTrue(exported.headers().firstValue("Content-Type").orElse("").contains("text/csv"));
        assertTrue(exported.headers().firstValue("Content-Disposition").orElse("").contains("attachment"));
        assertTrue(exported.body().startsWith("\uFEFF"));
        assertTrue(exported.body().contains("\"'=1+1,"+marker+"\""));
        assertTrue(exported.body().contains("\"Quoted \"\"text\"\"\nnext line\""));
        assertFalse(exported.body().contains(hidden.path("ticketNo").asText()));
        var all=call("GET","/api/tickets/export?query="+marker+"&priority=LOW",owner,null);
        assertEquals(200,all.statusCode());assertEquals(12,all.body().split("\r\n").length);
        assertEquals(10,ok("GET","/api/tickets?query="+marker+"&priority=LOW&size=10",owner,null,200).path("items").size());
        var techCsv=call("GET","/api/tickets/export?query="+marker,tech,null);
        assertEquals(403,techCsv.statusCode());assertFalse(techCsv.body().contains(selected.path("ticketNo").asText()));
        assertFalse(call("GET","/api/tickets/export"+filters,other,null).body().contains(selected.path("ticketNo").asText()));
        assertEquals(401,call("GET","/api/tickets/export",null,null).statusCode());
        assertEquals(400,call("GET","/api/tickets?assigneeId=-1",owner,null).statusCode());
        assertEquals(400,call("GET","/api/tickets/export?priority=INVALID",owner,null).statusCode());
    }
    @Test void workspaceCountsRespectOwnershipAndDispatchLoad()throws Exception{
        String owner=register("Workspace owner"),other=register("Workspace other"),admin=login("admin@fixflow.local");
        String email="workspace-tech-"+UUID.randomUUID()+"@example.com";
        long techId=ok("POST","/api/users",admin,Map.of("name","Workspace technician","email",email,"password","FixFlow123!","role","TECHNICIAN"),201).path("id").asLong();
        String tech=login(email);
        var input=Map.of("title","Workspace item","description","Details","category","OTHER","priority","LOW","location","Room");
        long id=ok("POST","/api/member/tickets",owner,input,201).path("id").asLong();
        ok("POST","/api/member/tickets",other,input,201);
        assertEquals(1,ok("GET","/api/member/summary",owner,null,200).path("active").asLong());
        assertEquals(0,ok("GET","/api/member/summary",tech,null,200).path("active").asLong());
        assertEquals(403,call("GET","/api/workspace/technicians",owner,null).statusCode());
        assertEquals(403,call("GET","/api/workspace/technicians",tech,null).statusCode());
        ok("PATCH","/api/tickets/"+id+"/assign",admin,Map.of("technicianId",techId),200);
        var summary=ok("GET","/api/workspace/summary",admin,null,200);
        assertEquals(2,summary.path("total").asLong());assertEquals(1,summary.path("byStatus").path("ASSIGNED").asLong());
        var staff=ok("GET","/api/workspace/technicians",admin,null,200);
        boolean found=false;for(var row:staff){if(row.path("id").asLong()==techId){found=true;assertEquals(1,row.path("assigned").asLong());assertEquals(0,row.path("inProgress").asLong());assertFalse(row.has("passwordHash"));}}
        assertTrue(found);
        long secondTech=ok("POST","/api/users",admin,Map.of("name","Other dispatch technician","email","second-"+UUID.randomUUID()+"@example.com","password","FixFlow123!","role","TECHNICIAN"),201).path("id").asLong();
        assertEquals(409,call("PATCH","/api/tickets/"+id+"/assign",admin,Map.of("technicianId",secondTech,"expectedStatus","OPEN")).statusCode());
        assertEquals(techId,ok("GET","/api/tickets/"+id,admin,null,200).path("assignedTo").path("id").asLong());
        assertEquals(0,ok("GET","/api/tickets?overdue=true",admin,null,200).path("total").asLong());
        var overdueTicket=workspaceTickets.findById(id).orElseThrow();overdueTicket.dueAt=java.time.Instant.now().minusSeconds(60);workspaceTickets.saveAndFlush(overdueTicket);
        assertEquals(1,ok("GET","/api/tickets?overdue=true",admin,null,200).path("total").asLong());
        assertEquals(403,call("GET","/api/tickets?overdue=true",other,null).statusCode());
        assertEquals(1,ok("GET","/api/workspace/summary",admin,null,200).path("overdue").asLong());
        ok("PATCH","/api/tickets/"+id+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        ok("POST","/api/tickets/"+id+"/repair-records",admin,Map.of("description","Finished"),201);
        assertEquals(0,ok("GET","/api/workspace/summary",admin,null,200).path("overdue").asLong());
        assertEquals(401,call("GET","/api/workspace/summary",null,null).statusCode());
    }
    @Autowired Environment env;
    @Autowired com.taskflow.fixflow.TicketRepository workspaceTickets;
    final HttpClient client=HttpClient.newHttpClient();
    final ObjectMapper json=new ObjectMapper();
    HttpResponse<String> call(String method,String path,String token,Object body) throws Exception {
        var builder=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+env.getProperty("local.server.port")+path)).header("Content-Type","application/json");
        if(token!=null)builder.header("Authorization","Bearer "+token);
        return client.send(builder.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());
    }
    JsonNode ok(String method,String path,String token,Object body,int status)throws Exception{
        var r=call(method,path,token,body);assertEquals(status,r.statusCode(),r.body());return json.readTree(r.body());
    }
    String login(String email)throws Exception{return ok("POST","/api/auth/login",null,Map.of("email",email,"password","FixFlow123!"),200).path("token").asText();}
    String register(String name)throws Exception{
        return ok("POST","/api/auth/register",null,Map.of("name",name,"email",UUID.randomUUID()+"@example.com","password","Customer123!","role","ADMIN"),201).path("token").asText();
    }
    @Test void fullWorkflowAndOwnership()throws Exception{
        String owner=staff("Customer"), other=register("Other"),admin=login("admin@fixflow.local"),tech=login("tech@fixflow.local");
        assertEquals("ADMIN",ok("GET","/api/users/me",owner,null,200).path("role").asText());
        var ticket=ok("POST","/api/tickets",owner,Map.of("title","冷氣漏水","description","會議室滴水","category","AIR_CONDITIONING","location","3F","priority","HIGH"),201);
        long id=ticket.path("id").asLong();String base="/api/tickets/"+id;
        assertEquals("OPEN",ticket.path("status").asText());assertFalse(ticket.path("dueAt").isMissingNode());
        assertEquals(403,call("GET",base,other,null).statusCode());
        assertEquals(403,call("GET",base,tech,null).statusCode());
        assertEquals(400,call("PATCH",base+"/assign",owner,Map.of("technicianId",999999999)).statusCode());
        assertEquals(409,call("PATCH",base+"/status",owner,Map.of("status","CLOSED")).statusCode());
        long techId=ok("GET","/api/users/me",tech,null,200).path("id").asLong();
        assertEquals("ASSIGNED",ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200).path("status").asText());
        assertEquals("IN_PROGRESS",ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200).path("status").asText());
        assertEquals(409,call("PATCH",base+"/status",admin,Map.of("status","RESOLVED")).statusCode());
        ok("POST",base+"/comments",owner,Map.of("content","謝謝協助"),201);
        assertEquals(400,call("POST",base+"/repair-records",admin,Map.of("description","  ")).statusCode());
        assertEquals("RESOLVED",ok("POST",base+"/repair-records",admin,Map.of("description","清理排水管並測試"),201).path("status").asText());
        assertEquals(403,call("PATCH",base+"/status",other,Map.of("status","CLOSED")).statusCode());
        assertEquals("CLOSED",ok("PATCH",base+"/status",owner,Map.of("status","CLOSED"),200).path("status").asText());
        assertEquals(409,call("PATCH",base+"/status",admin,Map.of("status","OPEN")).statusCode());
        var detail=ok("GET",base,owner,null,200);assertEquals(1,detail.path("comments").size());assertEquals(1,detail.path("repairs").size());assertTrue(detail.path("activities").size()>=6);
        assertEquals(200,call("GET","/api/dashboard/summary",owner,null).statusCode());
        assertTrue(ok("GET","/api/dashboard/summary",admin,null,200).path("total").asLong()>0);
        assertEquals(400,call("GET","/api/tickets?page=-1",owner,null).statusCode());
    }
    @Test void authenticationValidationAndDisable()throws Exception{
        assertEquals(401,call("GET","/api/tickets",null,null).statusCode());
        assertEquals(401,call("GET","/api/tickets","broken",null).statusCode());
        assertEquals(401,call("POST","/api/auth/login",null,Map.of("email","admin@fixflow.local","password","wrong")).statusCode());
        assertEquals(400,call("POST","/api/auth/register",null,Map.of("name"," ","email","bad","password","x")).statusCode());
        String user=register("Disable me"), admin=login("admin@fixflow.local");
        long id=ok("GET","/api/users/me",user,null,200).path("id").asLong();
        ok("PATCH","/api/users/"+id,admin,Map.of("enabled",false),200);
        assertEquals(401,call("GET","/api/users/me",user,null).statusCode());
        assertEquals(400,call("POST","/api/tickets",admin,Map.of("title"," ","description","x","category","OTHER","location","x","priority","LOW")).statusCode());
    }
    HttpResponse<String> upload(long id,String token,byte[] bytes)throws Exception{
        String boundary="FixFlowBoundary";
        var head=("--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"photo.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var tail=("\r\n--"+boundary+"--\r\n").getBytes(java.nio.charset.StandardCharsets.UTF_8);
        var stream=new java.io.ByteArrayOutputStream();stream.write(head);stream.write(bytes);stream.write(tail);
        var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+env.getProperty("local.server.port")+"/api/tickets/"+id+"/attachments"))
            .header("Authorization","Bearer "+token).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(stream.toByteArray())).build();
        return client.send(request,HttpResponse.BodyHandlers.ofString());
    }
    @Test void attachmentsAndCancellation()throws Exception{
        String owner=staff("Images"),other=register("Unrelated");
        var body=Map.of("title","Photo test","description","details","category","OTHER","location","Room","priority","LOW");
        long id=ok("POST","/api/tickets",owner,body,201).path("id").asLong();String base="/api/tickets/"+id;
        assertEquals(400,upload(id,owner,"not an image".getBytes()).statusCode());
        var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
        assertEquals(403,upload(id,other,out.toByteArray()).statusCode());
        var response=upload(id,owner,out.toByteArray());assertEquals(201,response.statusCode(),response.body());long attachmentId=json.readTree(response.body()).path("attachments").get(0).path("id").asLong();
        assertEquals(200,call("GET",base+"/attachments/"+attachmentId,owner,null).statusCode());
        assertEquals(403,call("GET",base+"/attachments/"+attachmentId,other,null).statusCode());
        var editBody=new HashMap<String,Object>(body);editBody.put("version",ok("GET",base,owner,null,200).path("version").asLong());
        ok("PUT",base,owner,editBody,200);
        assertEquals("CANCELLED",ok("PATCH",base+"/status",owner,Map.of("status","CANCELLED"),200).path("status").asText());
        assertEquals(409,call("PUT",base,owner,body).statusCode());
        assertEquals(409,upload(id,owner,out.toByteArray()).statusCode());
        assertEquals(409,call("POST",base+"/comments",owner,Map.of("content","after close")).statusCode());
    }
    @Test void busyTechnicianCannotBeDisabled()throws Exception{
        String admin=login("admin@fixflow.local"),customer=register("Busy technician owner");String email="tech-"+UUID.randomUUID()+"@example.com";
        long techId=ok("POST","/api/users",admin,Map.of("name","Temporary technician","email",email,"password","FixFlow123!","role","TECHNICIAN"),201).path("id").asLong();
        String tech=login(email);
        long id=ok("POST","/api/member/tickets",customer,Map.of("title","Active job","description","Repair","category","OTHER","priority","MEDIUM","location","Lab"),201).path("id").asLong();
        String base="/api/tickets/"+id;
        ok("PATCH",base+"/assign",admin,Map.of("technicianId",techId),200);
        assertEquals(409,call("PATCH","/api/users/"+techId,admin,Map.of("enabled",false)).statusCode());
        ok("PATCH",base+"/status",admin,Map.of("status","IN_PROGRESS"),200);
        assertEquals(409,call("PATCH","/api/users/"+techId,admin,Map.of("enabled",false)).statusCode());
        ok("POST",base+"/repair-records",admin,Map.of("description","Fixed"),201);
        ok("PATCH","/api/users/"+techId,admin,Map.of("enabled",false),200);
        assertEquals(401,call("GET","/api/users/me",tech,null).statusCode());
    }
    @Test void costReportScopesTotalsQueuesAndExport() throws Exception {
        String owner=staff("Cost owner"),other=register("Cost stranger");
        long person=ok("GET","/api/users/me",owner,null,200).path("id").asLong();
        var body=Map.of("title","=Cost report","description","Repair","category","OTHER","priority","LOW","location","Lab");
        long id=ok("POST","/api/tickets",owner,body,201).path("id").asLong();
        String base="/api/tickets/"+id;
        ok("PATCH",base+"/assign",owner,Map.of("technicianId",person),200);
        var ticket=ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
        ok("PUT",base+"/repair-draft",owner,Map.of("description","Draft","workHours","1","laborCost","900","parts",java.util.List.of(),"version",ticket.path("version").asLong()),200);
        assertEquals(0,ok("GET","/api/costs",owner,null,200).path("summary").path("totalCost").decimalValue().signum());
        ticket=ok("GET",base,owner,null,200);
        ok("POST",base+"/repair-records",owner,Map.of("description","Done","workHours","1","laborCost","125","parts",java.util.List.of(),"version",ticket.path("version").asLong()),201);
        var report=ok("GET","/api/costs?size=1",owner,null,200);
        assertEquals(125,report.path("summary").path("totalCost").asInt());
        assertEquals(id,report.path("items").get(0).path("ticketId").asLong());
        assertEquals(403,call("GET","/api/costs",other,null).statusCode());
        assertEquals(0,ok("GET","/api/costs?mode=MISSING",owner,null,200).path("total").asInt());
        assertEquals(1,ok("GET","/api/costs?mode=UNLINKED",owner,null,200).path("total").asInt());
        assertEquals(0,ok("GET","/api/costs?from=2000-01-01&to=2000-01-31",owner,null,200).path("total").asInt());
        assertEquals(0,ok("GET","/api/costs?equipment=no-match",owner,null,200).path("total").asInt());
        assertEquals(1,ok("GET","/api/costs?assigneeId="+person,owner,null,200).path("total").asInt());
        var csv=call("GET","/api/costs/export",owner,null);
        assertEquals(200,csv.statusCode());assertTrue(csv.body().contains("'=Cost report"));
        assertFalse(call("GET","/api/costs/export",other,null).body().contains("Cost report"));
        assertEquals(400,call("GET","/api/costs?from=2026-02-02&to=2026-01-01",owner,null).statusCode());
        assertEquals(400,call("GET","/api/costs?page=-1",owner,null).statusCode());
        assertEquals(401,call("GET","/api/costs",null,null).statusCode());
    }
    @Autowired org.springframework.jdbc.core.JdbcTemplate reportJdbc;
    @Test void costReportDistinguishesZeroFromMissingAndUsesTaipeiDates() throws Exception {
        String owner=staff("Cost boundary"),other=register("Cost outsider");
        long userId=ok("GET","/api/users/me",owner,null,200).path("id").asLong();
        var ids=new java.util.ArrayList<Long>();
        for(int i=0;i<3;i++){
            long id=ok("POST","/api/tickets",owner,Map.of("title","Boundary "+i,"description","Repair","category","OTHER","priority","LOW","location","Lab"),201).path("id").asLong();ids.add(id);
            String base="/api/tickets/"+id;
            ok("PATCH",base+"/assign",owner,Map.of("technicianId",userId),200);
            var t=ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
            Object repair=i==2?Map.of("description","Legacy record"):Map.of("description","Completed","workHours","1","laborCost",i==0?"100":"0","parts",java.util.List.of(),"version",t.path("version").asLong());
            ok("POST",base+"/repair-records",owner,repair,201);
            reportJdbc.update("update ff_entries set completed_at=? where ticket_id=? and kind='REPAIR'",java.sql.Timestamp.from(java.time.Instant.parse(i==0?"2030-01-31T16:00:00Z":"2030-02-01T16:00:00Z")),id);
        }
        var all=ok("GET","/api/costs?size=1",owner,null,200);
        assertEquals(2,all.path("total").asInt());assertEquals(2,all.path("totalPages").asInt());assertEquals(1,all.path("items").size());assertEquals(100,all.path("summary").path("totalCost").asInt());
        var missing=ok("GET","/api/costs?mode=MISSING",owner,null,200);
        assertEquals(1,missing.path("total").asInt());assertEquals(ids.get(2).longValue(),missing.path("items").get(0).path("ticketId").asLong());
        var day=ok("GET","/api/costs?from=2030-02-01&to=2030-02-01",owner,null,200);
        assertEquals(1,day.path("total").asInt());assertEquals(100,day.path("summary").path("totalCost").asInt());
        assertEquals(1,ok("GET","/api/costs/people",owner,null,200).size());assertEquals(403,call("GET","/api/costs/people",other,null).statusCode());
        long assetId=ok("POST","/api/assets",owner,Map.of("code","R-"+UUID.randomUUID(),"name","Cost asset","location","Lab","category","OTHER","enabled",true),201).path("id").asLong();
        String base="/api/tickets/"+ids.get(0);
        var closed=ok("PATCH",base+"/status",owner,Map.of("status","CLOSED"),200);
        ok("PATCH",base+"/asset",owner,Map.of("assetId",assetId,"version",closed.path("version").asLong()),200);
        assertEquals(2,ok("GET","/api/costs?mode=UNLINKED",owner,null,200).path("total").asInt());
        assertEquals(100,ok("GET","/api/costs?equipment=Cost%20asset",owner,null,200).path("summary").path("totalCost").asInt());
        assertEquals(0,ok("GET","/api/costs?equipment=%25",owner,null,200).path("total").asInt());
    }
    @Test void closedRepairCostsCanBeCorrectedWithAuditAndRevision() throws Exception {
        String owner=staff("Cost editor"),other=register("Other editor");
        long person=ok("GET","/api/users/me",owner,null,200).path("id").asLong();
        long asset=ok("POST","/api/assets",owner,Map.of("code","E-"+UUID.randomUUID(),"name","Audit asset","location","Lab","category","OTHER","enabled",true),201).path("id").asLong();
        long id=ok("POST","/api/tickets",owner,Map.of("title","Cost correction","description","Repair","category","OTHER","location","Lab","priority","LOW","assetId",asset),201).path("id").asLong();String base="/api/tickets/"+id;
        ok("PATCH",base+"/assign",owner,Map.of("technicianId",person),200);
        ok("PATCH",base+"/status",owner,Map.of("status","IN_PROGRESS"),200);
        var done=ok("POST",base+"/repair-records",owner,Map.of("description","Original repair"),201);
        long repairId=done.path("repairs").get(0).path("id").asLong();
        var closed=ok("PATCH",base+"/status",owner,Map.of("status","CLOSED"),200);
        closed=ok("GET",base,owner,null,200);
        var input=new HashMap<String,Object>(Map.of("repairId",repairId,"reason","補登收據","workHours","1.25","laborCost","100","parts",List.of(Map.of("name","Connector","quantity",2,"unitPrice","25")),"version",closed.path("version").asLong()));
        assertEquals(403,call("POST",base+"/cost-corrections",other,input).statusCode());
        var updated=ok("POST",base+"/cost-corrections",owner,input,200);
        assertEquals("CLOSED",updated.path("status").asText());assertEquals(closed.path("closedAt"),updated.path("closedAt"));assertEquals(closed.path("resolvedAt"),updated.path("resolvedAt"));
        assertEquals(1,updated.path("repairs").size());assertEquals("Original repair",updated.path("repairs").get(0).path("content").asText());assertEquals(150,updated.path("repairCostSummary").path("recordedTotal").asInt());
        assertEquals(1,updated.path("costChanges").size());assertTrue(updated.path("costChanges").get(0).path("content").asText().contains("未登錄"));assertTrue(updated.path("costChanges").get(0).path("content").asText().contains("150.00"));assertEquals("Cost editor",updated.path("costChanges").get(0).path("author").asText());
        assertEquals(409,call("POST",base+"/cost-corrections",owner,input).statusCode());
        assertEquals(150,ok("GET","/api/costs",owner,null,200).path("summary").path("totalCost").asInt());
        assertEquals(150,ok("GET","/api/assets/"+asset+"/tickets",owner,null,200).path("maintenanceSummary").path("totalCost").asInt());
        assertEquals(0,ok("GET","/api/costs?mode=MISSING",owner,null,200).path("total").asInt());
        input.put("version",updated.path("version").asLong());input.put("reason"," ");assertEquals(400,call("POST",base+"/cost-corrections",owner,input).statusCode());
        input.put("reason","保固免費");input.put("laborCost","-1");assertEquals(400,call("POST",base+"/cost-corrections",owner,input).statusCode());
        input.put("laborCost","0");input.put("parts",List.of());updated=ok("POST",base+"/cost-corrections",owner,input,200);
        assertEquals(0,updated.path("repairCostSummary").path("recordedTotal").asInt());assertEquals(2,updated.path("costChanges").size());
        assertEquals(0,ok("GET","/api/assets/"+asset+"/tickets",owner,null,200).path("maintenanceSummary").path("totalCost").asInt());
        assertEquals(0,ok("GET","/api/costs?mode=MISSING",owner,null,200).path("total").asInt());
    }
    @Test void costCorrectionRejectsActiveTicketsAndHandlesLegacyMissingRecords() throws Exception {
        String owner=staff("Legacy cost editor");
        long id=ok("POST","/api/tickets",owner,Map.of("title","Legacy repair","description","Old data","category","OTHER","location","Lab","priority","LOW"),201).path("id").asLong();String base="/api/tickets/"+id;
        var t=ok("GET",base,owner,null,200);
        var input=new HashMap<String,Object>(Map.of("reason","補登舊資料","workHours","0","laborCost","0","parts",List.of(),"version",t.path("version").asLong()));
        assertEquals(409,call("POST",base+"/cost-corrections",owner,input).statusCode());
        reportJdbc.update("update ff_tickets set status='CLOSED',resolved_at=?,closed_at=? where id=?",java.sql.Timestamp.from(java.time.Instant.parse("2020-01-01T00:00:00Z")),java.sql.Timestamp.from(java.time.Instant.parse("2020-01-02T00:00:00Z")),id);
        input.put("repairId",99999999L);assertEquals(404,call("POST",base+"/cost-corrections",owner,input).statusCode());input.remove("repairId");
        var updated=ok("POST",base+"/cost-corrections",owner,input,200);assertEquals(1,updated.path("repairs").size());assertEquals("2020-01-01T00:00:00Z",updated.path("repairs").get(0).path("completedAt").asText());
        assertEquals(0,updated.path("repairCostSummary").path("recordedTotal").asInt());assertEquals(1,updated.path("repairCostSummary").path("recordedRepairs").asInt());
        input.put("version",updated.path("version").asLong());assertEquals(409,call("POST",base+"/cost-corrections",owner,input).statusCode());
        input.put("repairId",updated.path("repairs").get(0).path("id").asLong());reportJdbc.update("update ff_tickets set status='CANCELLED' where id=?",id);assertEquals(409,call("POST",base+"/cost-corrections",owner,input).statusCode());
    }

}
