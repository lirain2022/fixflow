package com.taskflow.fixflow;
import java.io.IOException;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import org.springframework.security.core.Authentication;import org.springframework.web.multipart.MultipartFile;import org.springframework.transaction.annotation.Transactional;
@RestController @RequestMapping("/api/member/tickets/{ticketId}/attachments") @Transactional public class MemberAttachmentController {
 private final AttachmentService attachments;private final AuthService auth;private final MemberService members;
 public MemberAttachmentController(AttachmentService attachments,AuthService auth,MemberService members){this.attachments=attachments;this.auth=auth;this.members=members;}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object upload(Authentication a,@PathVariable Long ticketId,@RequestParam("file")MultipartFile file)throws IOException{User u=auth.current(a);members.requireOwned(ticketId,u,true);attachments.upload(u,ticketId,file);return members.detail(ticketId,u);}
 @GetMapping("/{id}") public Object download(Authentication a,@PathVariable Long ticketId,@PathVariable Long id)throws IOException{User u=auth.current(a);members.requireOwned(ticketId,u,false);return attachments.download(u,ticketId,id);}
}
