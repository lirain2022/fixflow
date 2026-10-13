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
}
