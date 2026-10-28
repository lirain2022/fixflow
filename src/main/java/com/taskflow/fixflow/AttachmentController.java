package com.taskflow.fixflow;
import java.io.IOException;import org.springframework.web.bind.annotation.*;import org.springframework.http.HttpStatus;import org.springframework.security.core.Authentication;import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/tickets/{ticketId}/attachments") public class AttachmentController {
 private final AttachmentService attachments;private final AuthService auth;
 public AttachmentController(AttachmentService attachments,AuthService auth){this.attachments=attachments;this.auth=auth;}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public Object upload(Authentication a,@PathVariable Long ticketId,@RequestParam("file")MultipartFile file)throws IOException{return attachments.upload(auth.current(a),ticketId,file);}
 @GetMapping("/{id}") public Object download(Authentication a,@PathVariable Long ticketId,@PathVariable Long id)throws IOException{return attachments.download(auth.current(a),ticketId,id);}
}
