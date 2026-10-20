package com.taskflow.fixflow;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth){this.auth=auth;}
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public Object register(@Valid @RequestBody Requests.Register input){return auth.register(input);}
    @PostMapping("/login") public Object login(@Valid @RequestBody Requests.Login input){return auth.login(input);}
    @PostMapping("/admin-login") public Object adminLogin(@Valid @RequestBody Requests.Login input){return auth.adminLogin(input);}
    @PostMapping("/member-login") public Object memberLogin(@Valid @RequestBody Requests.Login input){return auth.memberLogin(input);}
}
