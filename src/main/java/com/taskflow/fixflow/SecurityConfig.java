package com.taskflow.fixflow;

import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.web.SecurityFilterChain;
import com.nimbusds.jose.jwk.source.ImmutableSecret;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.security.*;

@Configuration
public class SecurityConfig {
    @Bean SecretKey signingKey(@Value("${fixflow.jwt-secret:}") String secret,Environment environment) {
        if(secret.isBlank()) {
            if(!environment.matchesProfiles("complete","local","test"))throw new IllegalStateException("Set FIXFLOW_JWT_SECRET to at least 32 bytes");
            byte[] bytes=new byte[32];new java.security.SecureRandom().nextBytes(bytes);return new SecretKeySpec(bytes,"HmacSHA256");
        }
        if(secret.getBytes(StandardCharsets.UTF_8).length<32)throw new IllegalStateException("FIXFLOW_JWT_SECRET must be at least 32 bytes");
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256");
    }
    @Bean JwtEncoder encoder(SecretKey key){return new NimbusJwtEncoder(new ImmutableSecret<>(key));}
    @Bean JwtDecoder decoder(SecretKey key){var decoder=NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer("fixflow"));return decoder;}
    @Bean PasswordEncoder passwords(){return new BCryptPasswordEncoder();}
    @Bean SecurityFilterChain security(HttpSecurity http,UserRepository users) throws Exception {
        return http.csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers("/api/auth/**","/hello","/swagger-ui/**","/swagger-ui.html","/v3/api-docs/**","/error").permitAll()
                .requestMatchers("/api/tasks/**").hasRole("ADMIN").anyRequest().authenticated())
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->{res.setStatus(401);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"message\":\"請重新登入\"}");})
                .accessDeniedHandler((req,res,ex)->{res.setStatus(403);res.setContentType("application/json;charset=UTF-8");res.getWriter().write("{\"message\":\"沒有操作權限\"}");}))
            .oauth2ResourceServer(o->o.jwt(j->j.jwtAuthenticationConverter(jwt->{
                User user;
                try {user=users.findById(Long.parseLong(jwt.getSubject())).filter(u->u.enabled).orElseThrow();if(!AuthService.currentSession(jwt,user))throw new IllegalArgumentException("Session revoked");}
                catch(RuntimeException e){throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"));}
                return new JwtAuthenticationToken(jwt,List.of(new SimpleGrantedAuthority("ROLE_"+user.role)),user.id.toString());
            }))).build();
    }
    @Bean OpenAPI apiDocs(){return new OpenAPI().info(new Info().title("FixFlow API").version("1.0"))
        .components(new Components().addSecuritySchemes("bearerAuth",new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")))
        .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));}
}
