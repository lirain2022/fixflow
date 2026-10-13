package com.taskflow;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
/** The original tutorial endpoints now require an administrator JWT. */
class SecuredTaskApiIntegrationTest extends FixFlowIntegrationTest {
    @Test void legacyTaskCrudRequiresAdmin() throws Exception {
        assertEquals(401,call("GET","/api/tasks",null,null).statusCode());
        String customer=register("Legacy customer");
        assertEquals(403,call("GET","/api/tasks",customer,null).statusCode());
        String admin=login("admin@fixflow.local");
        var created=ok("POST","/api/tasks",admin,java.util.Map.of("title","Legacy Task","description","Still supported"),200);
        String path="/api/tasks/"+created.path("id").asLong();
        assertEquals("TODO",created.path("status").asText());
        assertNotNull(created.path("createdAt"));
        assertEquals("Legacy Task",ok("GET",path,admin,null,200).path("title").asText());
        assertEquals("DONE",ok("PUT",path,admin,java.util.Map.of("title","Fixed","description","Done","status","DONE"),200).path("status").asText());
        assertEquals(200,call("DELETE",path,admin,null).statusCode());
        assertEquals("Hello TaskFlow!",call("GET","/hello",null,null).body());
    }
}
