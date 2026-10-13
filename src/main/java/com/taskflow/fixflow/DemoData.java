package com.taskflow.fixflow;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.boot.CommandLineRunner;
@Component @Profile({"complete","local","test"})
public class DemoData implements CommandLineRunner {
    private final AuthService auth;private final UserRepository users;
    public DemoData(AuthService auth,UserRepository users){this.auth=auth;this.users=users;}
    public void run(String...args){
        seed("管理員","admin@fixflow.local",Role.ADMIN);seed("維修技師","tech@fixflow.local",Role.TECHNICIAN);seed("報修人員","customer@fixflow.local",Role.CUSTOMER);
    }
    private void seed(String name,String email,Role role){if(users.findByEmail(email).isEmpty())auth.create(name,email,"FixFlow123!",role);}
}
