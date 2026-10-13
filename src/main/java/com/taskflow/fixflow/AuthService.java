package com.taskflow.fixflow;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
@Service @Transactional
public class AuthService {
    private final UserRepository users;private final PasswordEncoder passwords;private final JwtEncoder encoder;
    public AuthService(UserRepository users,PasswordEncoder passwords,JwtEncoder encoder){this.users=users;this.passwords=passwords;this.encoder=encoder;}
    public User current(Authentication auth){if(auth==null)throw new ApiException(401,"請登入");return users.findById(Long.parseLong(auth.getName())).filter(u->u.enabled).orElseThrow(()->new ApiException(401,"請重新登入"));}
    public void admin(User user){if(user.role!=Role.ADMIN)throw new ApiException(403,"需要管理員權限");}
    public void dispatcher(User user){if(!user.canDispatch())throw new ApiException(403,"由報修人員或管理員安排派工");}
    public Map<String,Object> view(User u){return Map.of("id",u.id,"name",u.name,"email",u.email,"role",u.role,"enabled",u.enabled,"createdAt",u.createdAt);}
    public User create(String name,String email,String password,Role role){
        String normalized=email.strip().toLowerCase(Locale.ROOT);
        if(users.findByEmail(normalized).isPresent())throw new ApiException(409,"此 Email 已註冊");
        if(password.getBytes(StandardCharsets.UTF_8).length>72)throw new ApiException(400,"密碼不可超過 72 個 UTF-8 位元組");
        User user=new User();user.name=name.strip();user.email=normalized;user.passwordHash=passwords.encode(password);user.role=role;return users.saveAndFlush(user);
    }
    public Map<String,Object> register(Requests.Register input){return session(create(input.name(),input.email(),input.password(),Role.CUSTOMER));}
    public Map<String,Object> login(Requests.Login input){
        if(input.password().getBytes(StandardCharsets.UTF_8).length>72)throw new ApiException(401,"Email 或密碼不正確");
        User user=users.findByEmail(input.email().strip().toLowerCase(Locale.ROOT)).orElse(null);
        if(user==null||!user.enabled||!passwords.matches(input.password(),user.passwordHash))throw new ApiException(401,"Email 或密碼不正確");return session(user);
    }
    public void changePassword(Authentication authentication,Requests.PasswordChange input){
        if(!(authentication instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwt))throw new ApiException(401,"請重新登入");
        User user=users.lockById(Long.parseLong(authentication.getName())).filter(u->u.enabled).orElseThrow(()->new ApiException(401,"請重新登入"));
        if(!currentSession(jwt.getToken(),user))throw new ApiException(401,"登入已失效，請重新登入");
        if(input.currentPassword().getBytes(StandardCharsets.UTF_8).length>72||!passwords.matches(input.currentPassword(),user.passwordHash))throw new ApiException(400,"目前密碼不正確");
        if(input.newPassword().getBytes(StandardCharsets.UTF_8).length>72)throw new ApiException(400,"新密碼不可超過 72 個 UTF-8 位元組");
        if(passwords.matches(input.newPassword(),user.passwordHash))throw new ApiException(400,"新密碼不可與目前密碼相同");
        user.passwordHash=passwords.encode(input.newPassword());user.authVersion++;
        users.saveAndFlush(user);
    }
    public static boolean currentSession(Jwt jwt,User user){return jwt.getClaim("authVersion") instanceof Number version&&version.longValue()==user.authVersion;}
    private Map<String,Object> session(User user){
        Instant now=Instant.now();var claims=JwtClaimsSet.builder().issuer("fixflow").subject(user.id.toString()).claim("authVersion",user.authVersion).issuedAt(now).expiresAt(now.plusSeconds(3600)).id(UUID.randomUUID().toString()).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return Map.of("token",token,"expiresAt",now.plusSeconds(3600),"user",view(user));
    }
}
