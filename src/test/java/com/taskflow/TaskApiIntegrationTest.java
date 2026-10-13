package com.taskflow;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.test.context.ActiveProfiles;
import com.taskflow.repository.TaskRepository;
import static org.junit.jupiter.api.Assertions.*;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class TaskApiIntegrationTest {
    @Autowired Environment environment;
    @Autowired TaskRepository repository;
    private final HttpClient client = HttpClient.newHttpClient();

    private HttpResponse<String> request(String method, String path, String body) throws Exception {
        var uri = URI.create("http://127.0.0.1:" + environment.getProperty("local.server.port") + path);
        var publisher = body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body);
        return client.send(HttpRequest.newBuilder(uri).header("Content-Type", "application/json")
                .method(method, publisher).build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void helloEndpointWorks() throws Exception {
        var response = request("GET", "/hello", null);
        assertEquals(200, response.statusCode());
        assertEquals("Hello TaskFlow!", response.body());
    }

    @Test
    void existingCrudWorksThroughHttpAndDatabase() throws Exception {
        repository.deleteAll();
        var created = request("POST", "/api/tasks", """
                {"title":"Air conditioner leak","description":"Meeting room"}
                """);
        assertEquals(200, created.statusCode());
        var tasks = repository.findAll();
        assertEquals(1, tasks.size());
        var task = tasks.getFirst();
        assertEquals("TODO", task.getStatus().name());
        assertNotNull(task.getCreatedAt());
        assertNotNull(task.getUpdatedAt());
        var path = "/api/tasks/" + task.getId();
        assertTrue(request("GET", path, null).body().contains("Air conditioner leak"));
        assertTrue(request("GET", "/api/tasks", null).body().contains("Air conditioner leak"));
        var updated = request("PUT", path, """
                {"title":"Repair complete","description":"Drain cleared","status":"DONE"}
                """);
        assertEquals(200, updated.statusCode());
        assertEquals("DONE", repository.findById(task.getId()).orElseThrow().getStatus().name());
        assertEquals(200, request("DELETE", path, null).statusCode());
        assertTrue(repository.findById(task.getId()).isEmpty());
    }
}
