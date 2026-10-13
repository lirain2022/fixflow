package com.taskflow.fixflow;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
@Component @Profile("prod")
public class AdminBootstrap implements CommandLineRunner {
    private final AuthService auth;private final UserRepository users;private final String email,password;
    public AdminBootstrap(AuthService auth,UserRepository users,@Value("${FIXFLOW_ADMIN_EMAIL:}") String email,@Value("${FIXFLOW_ADMIN_PASSWORD:}") String password){this.auth=auth;this.users=users;this.email=email;this.password=password;}
    public void run(String...args){
        if(users.count()==0){if(email.isBlank()||password.length()<12)throw new IllegalStateException("First startup requires FIXFLOW_ADMIN_EMAIL and FIXFLOW_ADMIN_PASSWORD (12+ characters)");auth.create("管理員",email,password,Role.ADMIN);}
    }
}
