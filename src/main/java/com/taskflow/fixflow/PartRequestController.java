package com.taskflow.fixflow;
import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import org.springframework.security.core.Authentication;import org.springframework.http.HttpStatus;
@RestController public class PartRequestController {
 private final PartRequestService parts;private final AuthService auth;
 public PartRequestController(PartRequestService parts,AuthService auth){this.parts=parts;this.auth=auth;}
 @PostMapping("/api/member/tickets/{id}/part-requests") @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@PathVariable Long id,@Valid @RequestBody PartRequestService.Input input){return parts.create(id,auth.current(a),input);}
 @GetMapping("/api/member/part-requests") public Object list(Authentication a,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="10")int size){return parts.list(auth.current(a),page,size);}
 @GetMapping("/api/member/tickets/{id}/part-requests") public Object ownTicket(Authentication a,@PathVariable Long id){return parts.ticket(id,auth.current(a),true);}
 @GetMapping("/api/tickets/{id}/part-requests") public Object ticket(Authentication a,@PathVariable Long id){return parts.ticket(id,auth.current(a),false);}
 @PostMapping("/api/member/part-requests/{id}/withdraw") public Object withdraw(Authentication a,@PathVariable Long id,@Valid @RequestBody PartRequestService.Revision input){return parts.update(id,auth.current(a),input.version(),"WITHDRAWN",null);}
 @PostMapping("/api/part-requests/{id}/reply") public Object reply(Authentication a,@PathVariable Long id,@Valid @RequestBody PartRequestService.Reply input){return parts.update(id,auth.current(a),input.version(),input.status(),input.reply());}
}
