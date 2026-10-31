package com.taskflow.fixflow;
import java.util.*;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;
@RestController @RequestMapping("/api/users") @Transactional
public class UserController {
    private final AuthService auth;private final UserRepository users;private final TicketRepository tickets;private final RepairQuoteRepository quotes;
    public UserController(AuthService auth,UserRepository users,TicketRepository tickets,RepairQuoteRepository quotes){this.auth=auth;this.users=users;this.tickets=tickets;this.quotes=quotes;}
    @GetMapping("/me") public Object me(Authentication a){return auth.view(auth.current(a));}
    @PostMapping("/me/password") @ResponseStatus(HttpStatus.NO_CONTENT) public void password(Authentication a,@Valid @RequestBody Requests.PasswordChange input){auth.changePassword(a,input);}
    @GetMapping public Object list(Authentication a){auth.admin(auth.current(a));return users.findAll(org.springframework.data.domain.Sort.by("id")).stream().map(auth::view).toList();}
    @GetMapping("/technicians") public Object technicians(Authentication a){auth.dispatcher(auth.current(a));return users.findByEnabledTrueOrderByName().stream().map(u->Map.of("id",u.id,"name",u.name,"email",u.email)).toList();}
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@Valid @RequestBody Requests.Staff input){auth.admin(auth.current(a));return auth.view(auth.create(input.name(),input.email(),input.password(),input.role()));}
    @PatchMapping("/{id}") public Object update(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.UserUpdate input){
        User actor=auth.current(a);auth.admin(actor);
        User user=users.lockById(id).orElseThrow(()->new ApiException(404,"找不到帳號"));
        if(!input.enabled()&&user.role==Role.ADMIN)throw new ApiException(409,"不可停用管理員帳號");
        if(!input.enabled()&&tickets.existsByAssignedToIdAndStatusIn(id,List.of(com.taskflow.entity.TicketStatus.ASSIGNED,com.taskflow.entity.TicketStatus.IN_PROGRESS)))throw new ApiException(409,"此技師仍有待處理或維修中工單，請先移交待處理工單或完成維修");
        if(!input.enabled()&&quotes.hasOutstandingConsent(id,List.of(com.taskflow.entity.TicketStatus.OPEN,com.taskflow.entity.TicketStatus.ASSIGNED,com.taskflow.entity.TicketStatus.IN_PROGRESS)))throw new ApiException(409,"此會員仍有待確認或待重新報價的工單，請先處理報價或取消工單，再停用帳號");
        user.enabled=input.enabled();return auth.view(users.save(user));
    }
}
