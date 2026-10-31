package com.taskflow.fixflow;
import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import org.springframework.security.core.Authentication;
@RestController
public class RepairQuoteController {
 private final RepairQuoteService quotes;private final AuthService auth;
 public RepairQuoteController(RepairQuoteService quotes,AuthService auth){this.quotes=quotes;this.auth=auth;}
 @GetMapping("/api/tickets/{id}/quotes") public Object list(Authentication a,@PathVariable Long id){return quotes.list(id,auth.current(a),false);}
 @PostMapping("/api/tickets/{id}/quotes") @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@PathVariable Long id,@Valid @RequestBody RepairQuoteService.Input input){return quotes.create(id,auth.current(a),input);}
 @GetMapping("/api/member/tickets/{id}/quotes") public Object own(Authentication a,@PathVariable Long id){return quotes.list(id,auth.current(a),true);}
 @PostMapping("/api/member/tickets/{id}/quotes/respond") public Object respond(Authentication a,@PathVariable Long id,@Valid @RequestBody RepairQuoteService.Response input){return quotes.respond(id,auth.current(a),input);}
}
