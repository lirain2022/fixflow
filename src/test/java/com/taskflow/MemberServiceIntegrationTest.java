package com.taskflow;
import java.net.URI;import java.net.http.*;import java.util.*;
import org.junit.jupiter.api.Test;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.test.context.ActiveProfiles;import org.springframework.core.env.Environment;import tools.jackson.databind.*;import static org.junit.jupiter.api.Assertions.*;
@ActiveProfiles("test") @SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:member-tests;DB_CLOSE_DELAY=-1","spring.jpa.hibernate.ddl-auto=validate","fixflow.redis-enabled=false","fixflow.upload-dir=./target/member-test-uploads"})
class MemberServiceIntegrationTest {
 @Autowired Environment env;final ObjectMapper json=new ObjectMapper();final HttpClient client=HttpClient.newHttpClient();
 HttpResponse<String> call(String method,String path,String token,Object body)throws Exception{var b=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+path)).header("Content-Type","application/json");if(token!=null)b.header("Authorization","Bearer "+token);return client.send(b.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(),HttpResponse.BodyHandlers.ofString());}
 JsonNode ok(String method,String path,String token,Object body,int code)throws Exception{var r=call(method,path,token,body);assertEquals(code,r.statusCode(),r.body());return r.body().isBlank()?json.createObjectNode():json.readTree(r.body());}
 String register()throws Exception{return ok("POST","/api/auth/register",null,Map.of("name","Member","email",UUID.randomUUID()+"@example.com","password","Member12345!"),201).path("token").asText();}
 String admin()throws Exception{return ok("POST","/api/auth/admin-login",null,Map.of("email","admin@fixflow.local","password","FixFlow123!"),200).path("token").asText();}
 long create(String token)throws Exception{return ok("POST","/api/member/tickets",token,Map.of("title","Laptop","description","Broken","location","Room","category","EQUIPMENT","priority","LOW"),201).path("id").asLong();}
 @Test void memberBoundaryAndPartsLifecycle()throws Exception{
 String a=register(),b=register(),staff=admin();long id=create(a);String t="/api/member/tickets/"+id;
 assertEquals(401,call("GET",t,null,null).statusCode());assertEquals(404,call("GET",t,b,null).statusCode());
 for(String path:List.of("/api/tickets","/api/assets","/api/users/technicians","/api/workspace","/api/costs","/api/notifications"))assertEquals(403,call("GET",path,a,null).statusCode(),path);
 assertFalse(ok("GET",t,a,null,200).has("repairDraft"));
 var body=new HashMap<String,Object>(Map.of("name","SSD","quantity",1,"purpose","Upgrade storage","referenceUrl","https://example.com/ssd"));
 var part=ok("POST",t+"/part-requests",a,body,201);long pid=part.path("id").asLong();
 assertEquals(404,call("POST",t+"/part-requests",b,body).statusCode());body.put("referenceUrl","javascript:alert(1)");assertEquals(400,call("POST",t+"/part-requests",a,body).statusCode());body.put("referenceUrl","");body.put("quantity",100);assertEquals(400,call("POST",t+"/part-requests",a,body).statusCode());
 var reply=Map.of("version",part.path("version").asLong(),"status","REVIEWED","reply","Please confirm compatibility");ok("POST","/api/part-requests/"+pid+"/reply",staff,reply,200);
 assertEquals(403,call("POST","/api/part-requests/"+pid+"/reply",a,reply).statusCode());
 assertEquals(409,call("POST","/api/member/part-requests/"+pid+"/withdraw",a,Map.of("version",part.path("version").asLong())).statusCode());
 assertEquals(0,ok("GET",t,a,null,200).path("repairCostSummary").path("recordedTotal").asInt());
 assertTrue(ok("GET","/api/member/notifications",a,null,200).path("total").asInt()>0);
 var second=ok("POST",t+"/part-requests",a,Map.of("name","RAM","quantity",2,"purpose","Upgrade"),201);
 ok("POST","/api/member/part-requests/"+second.path("id").asLong()+"/withdraw",a,Map.of("version",second.path("version").asLong()),200);
 ok("POST",t+"/cancel",a,Map.of(),200);assertEquals(409,call("POST",t+"/part-requests",a,Map.of("name","RAM","quantity",1,"purpose","Upgrade")).statusCode());
 }
 @Test void administratorRepairAndMemberAcceptance()throws Exception{
 String a=register(),b=register(),staff=admin();long id=create(a);String t="/api/tickets/"+id,m="/api/member/tickets/"+id;long uid=ok("GET","/api/users/me",staff,null,200).path("id").asLong();
 ok("PATCH",t+"/assign",staff,Map.of("technicianId",uid),200);var started=ok("PATCH",t+"/status",staff,Map.of("status","IN_PROGRESS"),200);
 assertEquals(403,call("PATCH",t+"/status",a,Map.of("status","IN_PROGRESS")).statusCode());
 ok("POST",t+"/repair-records",staff,Map.of("description","Fixed","workHours",1,"laborCost",200,"parts",List.of(),"version",started.path("version").asLong()),201);
 assertEquals(404,call("POST",m+"/accept",b,Map.of()).statusCode());ok("POST",m+"/accept",a,Map.of(),200);
 assertEquals("CLOSED",ok("GET",m,a,null,200).path("status").asText());
 }

 @Test void partRequestValidationBoundariesAndOwnerIsolation()throws Exception{
  String a=register(),b=register(),staff=admin();long id=create(a);String path="/api/member/tickets/"+id+"/part-requests";
  var valid=new HashMap<String,Object>(Map.of("name","N".repeat(120),"quantity",99,"purpose","P".repeat(2000),"referenceUrl","https://example.com/part"));
  var part=ok("POST",path,a,valid,201);long pid=part.path("id").asLong();
  assertEquals(404,call("GET",path,b,null).statusCode());assertEquals(0,ok("GET","/api/member/part-requests",b,null,200).path("total").asInt());
  assertEquals(404,call("POST","/api/member/part-requests/"+pid+"/withdraw",b,Map.of("version",part.path("version").asLong())).statusCode());
  for(var bad:List.of(Map.of("name"," "),Map.of("name","x".repeat(121)),Map.of("purpose"," "),Map.of("purpose","x".repeat(2001)),Map.of("quantity",0),Map.of("quantity",100),Map.of("referenceUrl","file:///etc/passwd"),Map.of("referenceUrl","https://user:password@example.com"),Map.of("referenceUrl","x".repeat(1001)))){var input=new HashMap<String,Object>(valid);input.putAll(bad);assertEquals(400,call("POST",path,a,input).statusCode());}
  assertEquals(400,call("POST","/api/part-requests/"+pid+"/reply",staff,Map.of("version",part.path("version").asLong(),"status","REVIEWED","reply"," ")).statusCode());
  assertEquals(400,call("POST","/api/part-requests/"+pid+"/reply",staff,Map.of("version",part.path("version").asLong(),"status","WITHDRAWN","reply","invalid state")).statusCode());
  assertEquals("PENDING",ok("GET",path,a,null,200).get(0).path("status").asText());
 }
 @Test void replyAndWithdrawalRaceHasExactlyOneWinner()throws Exception{
  String a=register(),staff=admin();long id=create(a);var part=ok("POST","/api/member/tickets/"+id+"/part-requests",a,Map.of("name","RAM","quantity",1,"purpose","Upgrade"),201);long pid=part.path("id").asLong(),version=part.path("version").asLong();
  var gate=new java.util.concurrent.CountDownLatch(1);
  var reply=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{gate.await();return call("POST","/api/part-requests/"+pid+"/reply",staff,Map.of("version",version,"status","REVIEWED","reply","Compatible")).statusCode();}catch(Exception e){throw new RuntimeException(e);}});
  var withdraw=java.util.concurrent.CompletableFuture.supplyAsync(()->{try{gate.await();return call("POST","/api/member/part-requests/"+pid+"/withdraw",a,Map.of("version",version)).statusCode();}catch(Exception e){throw new RuntimeException(e);}});
  gate.countDown();var results=new ArrayList<>(List.of(reply.get(20,java.util.concurrent.TimeUnit.SECONDS),withdraw.get(20,java.util.concurrent.TimeUnit.SECONDS)));Collections.sort(results);assertEquals(List.of(200,409),results);
  assertEquals(0,ok("GET","/api/member/tickets/"+id,a,null,200).path("repairCostSummary").path("recordedTotal").asInt());
 }
 @Test void legacyTokensAndForgedFieldsCannotExpandMemberAccess()throws Exception{
  String email=UUID.randomUUID()+"@example.com";ok("POST","/api/auth/register",null,Map.of("name","Member","email",email,"password","Member12345!","role","ADMIN"),201);
  String token=ok("POST","/api/auth/login",null,Map.of("email",email,"password","Member12345!"),200).path("token").asText();
  String staff=admin();long staffId=ok("GET","/api/users/me",staff,null,200).path("id").asLong();
  var body=new HashMap<String,Object>(Map.of("title","Forged owner","description","Fault","location","Room","category","OTHER","priority","LOW","createdBy",staffId));
  long id=ok("POST","/api/member/tickets",token,body,201).path("id").asLong();
  assertEquals("CUSTOMER",ok("GET","/api/users/me",token,null,200).path("role").asText());
  assertNotEquals(staffId,ok("GET","/api/tickets/"+id,staff,null,200).path("createdBy").path("id").asLong());
  body.put("assetId",1);assertEquals(400,call("POST","/api/member/tickets",token,body).statusCode());
  for(String path:List.of("/api/tickets/export","/api/tickets/unlinked-assets","/api/workspace/summary","/api/workspace/technicians","/api/dashboard/summary","/api/costs/export","/api/costs/people","/api/users","/api/tasks"))assertEquals(403,call("GET",path,token,null).statusCode(),path);
  assertEquals(403,call("GET","/api/member/tickets",staff,null).statusCode());
 }
 HttpResponse<String> upload(long id,String token,byte[] bytes)throws Exception{
  String boundary="member-upload";var out=new java.io.ByteArrayOutputStream();out.write(("--"+boundary+"\r\nContent-Disposition: form-data; name=\"file\"; filename=\"photo.png\"\r\nContent-Type: image/png\r\n\r\n").getBytes());out.write(bytes);out.write(("\r\n--"+boundary+"--\r\n").getBytes());
  var r=HttpRequest.newBuilder(URI.create("http://localhost:"+env.getProperty("local.server.port")+"/api/member/tickets/"+id+"/attachments")).header("Authorization","Bearer "+token).header("Content-Type","multipart/form-data; boundary="+boundary).POST(HttpRequest.BodyPublishers.ofByteArray(out.toByteArray())).build();return client.send(r,HttpResponse.BodyHandlers.ofString());
 }
 @Test void memberPhotosArePrivateAndClosedReportsRejectFurtherChanges()throws Exception{
  String a=register(),b=register();long id=create(a);String path="/api/member/tickets/"+id;
  var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new java.io.ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
  assertEquals(404,upload(id,b,out.toByteArray()).statusCode());assertEquals(400,upload(id,a,"invalid".getBytes()).statusCode());
  var uploaded=upload(id,a,out.toByteArray());assertEquals(201,uploaded.statusCode(),uploaded.body());long attachment=json.readTree(uploaded.body()).path("attachments").get(0).path("id").asLong();
  assertEquals(200,call("GET",path+"/attachments/"+attachment,a,null).statusCode());assertEquals(404,call("GET",path+"/attachments/"+attachment,b,null).statusCode());
  ok("POST",path+"/cancel",a,null,200);assertEquals(409,upload(id,a,out.toByteArray()).statusCode());assertEquals(409,call("POST",path+"/comments",a,Map.of("content","closed")).statusCode());
  assertEquals(200,call("GET",path+"/attachments/"+attachment,a,null).statusCode());
 }
}
