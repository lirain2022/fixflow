package com.taskflow.fixflow;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;private final AuthService auth;
    public NotificationController(NotificationService notifications,AuthService auth){this.notifications=notifications;this.auth=auth;}
    @GetMapping public Object list(Authentication a,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size,@RequestParam(defaultValue="false") boolean unreadOnly){return notifications.list(auth.current(a),page,size,unreadOnly);}
    @GetMapping("/unread-count") public Object unread(Authentication a){return notifications.unread(auth.current(a));}
    @PatchMapping("/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT) public void read(Authentication a,@PathVariable Long id){notifications.read(auth.current(a),id);}
    @PatchMapping("/read-all") @ResponseStatus(HttpStatus.NO_CONTENT) public void readAll(Authentication a){notifications.readAll(auth.current(a));}
}
