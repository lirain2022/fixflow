package com.taskflow;
import java.net.URI;import java.net.http.*;import java.util.*;
import org.junit.jupiter.api.Test;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.test.context.ActiveProfiles;import org.springframework.core.env.Environment;import tools.jackson.databind.*;import static org.junit.jupiter.api.Assertions.*;
@ActiveProfiles("test") @SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:quote-tests;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=validate","fixflow.redis-enabled=false","fixflow.upload-dir=./target/quote-test-uploads"})
class QuoteIntegrationTest {
 @Autowired Environment env;final ObjectMapper json=new ObjectMapper();final HttpClient client=HttpClient.newHttpClient();
 HttpResponse<String> call(String method,String path,String token,Object body)throws Exception{var b=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+path)).header("Content-Type","application/json");if(token!=null)b.header("Authorization","Bearer "+token);return client.send(b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());}
 JsonNode ok(String method,String path,String token,Object body,int code)throws Exception{var r=call(method,path,token,body);assertEquals(code,r.statusCode(),r.body());return r.body().isBlank()?json.createObjectNode():json.readTree(r.body());}
 String member()throws Exception{return ok("POST","/api/auth/register",null,Map.of("name","Member","email",UUID.randomUUID()+"@example.com","password","Member12345!"),201).path("token").asText();}
 String admin()throws Exception{return ok("POST","/api/auth/admin-login",null,Map.of("email","admin@fixflow.local","password","FixFlow123!"),200).path("token").asText();}
 long create(String token)throws Exception{return ok("POST","/api/member/tickets",token,input(),201).path("id").asLong();}
 Map<String,Object> input(){return Map.of("title","Laptop","description","Broken","location","Room","category","EQUIPMENT","priority","LOW");}
 Map<String,Object> quote(Long previous){var body=new HashMap<String,Object>(Map.of("laborCost","100.10","partsCost","200.20","description","Replace SSD and test"));body.put("previousQuoteId",previous);return body;}
 Map<String,Object> decision(JsonNode q,String status){return Map.of("quoteId",q.path("id").asLong(),"version",q.path("version").asLong(),"decision",status,"message",status.equals("ACCEPTED")?"":"Please explain parts");}
 @Test void quoteConsentGatesRepairAndNeverCreatesActualCost()throws Exception{
  String owner=member(),other=member(),staff=admin();long id=create(owner);String a="/api/tickets/"+id,m="/api/member/tickets/"+id;
  var q=ok("POST",a+"/quotes",staff,quote(null),201).path("latest");assertEquals("300.30",q.path("total").asText());
  assertEquals(404,call("GET",m+"/quotes",other,null).statusCode());assertEquals(403,call("POST",a+"/quotes",owner,quote(null)).statusCode());assertEquals(403,call("POST",m+"/quotes/respond",staff,decision(q,"ACCEPTED")).statusCode());
  long uid=ok("GET","/api/users/me",staff,null,200).path("id").asLong();ok("PATCH",a+"/assign",staff,Map.of("technicianId",uid),200);
  assertEquals(409,call("PATCH",a+"/status",staff,Map.of("status","IN_PROGRESS")).statusCode());
  assertEquals(404,call("POST",m+"/quotes/respond",other,decision(q,"ACCEPTED")).statusCode());
  ok("POST",m+"/quotes/respond",owner,decision(q,"ACCEPTED"),200);
  assertEquals(409,call("POST",m+"/quotes/respond",owner,decision(q,"ACCEPTED")).statusCode());
  ok("PATCH",a+"/status",staff,Map.of("status","IN_PROGRESS"),200);
  var newer=ok("POST",a+"/quotes",staff,quote(q.path("id").asLong()),201).path("latest");
  assertEquals(409,call("POST",a+"/repair-records",staff,Map.of("description","Fixed","workHours",1,"laborCost",400,"parts",List.of())).statusCode());
  ok("POST",m+"/quotes/respond",owner,decision(newer,"ACCEPTED"),200);
  assertEquals(0,ok("GET",m,owner,null,200).path("repairCostSummary").path("recordedTotal").asInt());
  ok("POST",a+"/repair-records",staff,Map.of("description","Fixed","workHours",1,"laborCost",400,"parts",List.of()),201);
  assertEquals(400,ok("GET",m,owner,null,200).path("repairCostSummary").path("recordedTotal").asInt());
  assertEquals(409,call("POST",a+"/quotes",staff,quote(newer.path("id").asLong())).statusCode());
 }
 @Test void questionsAndRevisionsPreserveHistoryAndRejectStaleConsent()throws Exception{
  String owner=member(),staff=admin();long id=create(owner);String a="/api/tickets/"+id+"/quotes",m="/api/member/tickets/"+id+"/quotes";
  var first=ok("POST",a,staff,quote(null),201).path("latest");
  var response=ok("POST",m+"/respond",owner,decision(first,"CHANGES_REQUESTED"),200);assertEquals("CHANGES_REQUESTED",response.path("latest").path("status").asText());
  var second=ok("POST",a,staff,quote(first.path("id").asLong()),201).path("latest");
  assertEquals(409,call("POST",m+"/respond",owner,decision(first,"ACCEPTED")).statusCode());
  var old=decision(second,"ACCEPTED");var bad=new HashMap<String,Object>(old);bad.put("version",999);assertEquals(409,call("POST",m+"/respond",owner,bad).statusCode());
  var data=ok("GET",m,owner,null,200);assertEquals(2,data.path("history").size());assertEquals("Please explain parts",data.path("history").get(1).path("response").asText());
  assertTrue(ok("GET","/api/member/notifications",owner,null,200).path("items").toString().contains("QUOTE"));
  ok("POST","/api/member/tickets/"+id+"/cancel",owner,Map.of(),200);assertEquals(409,call("POST",m+"/respond",owner,decision(second,"ACCEPTED")).statusCode());
 }
 @Test void validatesAmountsAndInternalTicketsWithoutSavingInvalidQuotes()throws Exception{
  String owner=member(),staff=admin();long id=create(owner);String a="/api/tickets/"+id+"/quotes";
  for(var invalid:List.of(Map.of("laborCost","-1"),Map.of("partsCost","0.001"),Map.of("laborCost","10000000000"),Map.of("description"," "),Map.of("description","a".repeat(2001)))){var body=quote(null);body.putAll(invalid);assertEquals(400,call("POST",a,staff,body).statusCode());}
  assertEquals(0,ok("GET",a,staff,null,200).path("history").size());
  var zero=quote(null);zero.put("laborCost","0");zero.put("partsCost","0");var q=ok("POST",a,staff,zero,201).path("latest");assertEquals("0.00",q.path("total").asText());
  var answer=new HashMap<String,Object>(decision(q,"CHANGES_REQUESTED"));answer.put("message"," ");assertEquals(400,call("POST","/api/member/tickets/"+id+"/quotes/respond",owner,answer).statusCode());
  long internal=ok("POST","/api/tickets",staff,input(),201).path("id").asLong();assertEquals(400,call("POST","/api/tickets/"+internal+"/quotes",staff,quote(null)).statusCode());
 }
 @Test void pendingConsentPreventsAccountDeactivation()throws Exception{
  String owner=member(),staff=admin();long id=create(owner),uid=ok("GET","/api/users/me",owner,null,200).path("id").asLong();
  var q=ok("POST","/api/tickets/"+id+"/quotes",staff,quote(null),201).path("latest");
  assertEquals(409,call("PATCH","/api/users/"+uid,staff,Map.of("enabled",false)).statusCode());
  ok("POST","/api/member/tickets/"+id+"/quotes/respond",owner,decision(q,"ACCEPTED"),200);
  ok("PATCH","/api/users/"+uid,staff,Map.of("enabled",false),200);
 }
 @Test void quoteCreationAndDeactivationCannotStrandConsent()throws Exception{
  String owner=member(),staff=admin();long id=create(owner),uid=ok("GET","/api/users/me",owner,null,200).path("id").asLong();var gate=new java.util.concurrent.CountDownLatch(1);
  try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
   var first=pool.submit(()->{gate.await();return call("POST","/api/tickets/"+id+"/quotes",staff,quote(null)).statusCode();});
   var second=pool.submit(()->{gate.await();return call("PATCH","/api/users/"+uid,staff,Map.of("enabled",false)).statusCode();});gate.countDown();
   var result=List.of(first.get(),second.get());assertTrue(result.equals(List.of(201,409))||result.equals(List.of(400,200)),result.toString());
  }
 }
 @Test void concurrentFirstQuotesHaveOneWinner()throws Exception{
  String owner=member(),staff=admin();long id=create(owner);String path="/api/tickets/"+id+"/quotes";var gate=new java.util.concurrent.CountDownLatch(1);
  try(var pool=java.util.concurrent.Executors.newFixedThreadPool(2)){
   java.util.concurrent.Callable<Integer> task=()->{gate.await();return call("POST",path,staff,quote(null)).statusCode();};var first=pool.submit(task);var second=pool.submit(task);gate.countDown();var results=new ArrayList<>(List.of(first.get(),second.get()));Collections.sort(results);assertEquals(List.of(201,409),results);
  }
  assertEquals(1,ok("GET",path,staff,null,200).path("history").size());
 }
}
