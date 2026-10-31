package com.taskflow.fixflow;
import jakarta.validation.Valid;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import org.springframework.security.core.Authentication;import com.taskflow.entity.TicketStatus;
@RestController @RequestMapping("/api/member") public class MemberController {
 private final MemberService members;private final AuthService auth;private final NotificationService notifications;private final MemberReportService reports;
 public MemberController(MemberService members,AuthService auth,NotificationService notifications,MemberReportService reports){this.members=members;this.auth=auth;this.notifications=notifications;this.reports=reports;}
 @GetMapping("/tickets") public Object list(Authentication a,@RequestParam(defaultValue="")String query,@RequestParam(required=false)TicketStatus status,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="10")int size,@RequestParam(defaultValue="false")boolean active){return members.list(auth.current(a),query,status,page,size,active);}
 @GetMapping("/summary") public Object summary(Authentication a){return members.summary(auth.current(a));}
 @GetMapping("/tickets/{id}") public Object get(Authentication a,@PathVariable Long id){return members.detail(id,auth.current(a));}
 @PostMapping("/tickets") @ResponseStatus(HttpStatus.CREATED) public Object create(Authentication a,@Valid @RequestBody MemberReportService.ReportInput input){return reports.create(auth.current(a),input);}
 @PostMapping("/tickets/{id}/comments") public Object comment(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Comment input){return members.action(id,auth.current(a),"comment",input.content());}
 @PostMapping("/tickets/{id}/rework") public Object rework(Authentication a,@PathVariable Long id,@Valid @RequestBody Requests.Rework input){return members.action(id,auth.current(a),"rework",input.reason());}
 @PostMapping("/tickets/{id}/accept") public Object accept(Authentication a,@PathVariable Long id){return members.action(id,auth.current(a),"accept",null);}
 @PostMapping("/tickets/{id}/cancel") public Object cancel(Authentication a,@PathVariable Long id){return members.action(id,auth.current(a),"cancel",null);}
 @GetMapping("/notifications") public Object notifications(Authentication a,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="10")int size){return notifications.list(auth.current(a),page,size,false);}
 @PostMapping("/notifications/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT) public void read(Authentication a,@PathVariable Long id){notifications.read(auth.current(a),id);}
}
