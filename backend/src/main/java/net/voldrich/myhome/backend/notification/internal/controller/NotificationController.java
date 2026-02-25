package net.voldrich.myhome.backend.notification.internal.controller;

import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.notification.internal.dto.NotificationResponse;
import net.voldrich.myhome.backend.notification.internal.service.NotificationService;
import net.voldrich.myhome.backend.notification.internal.service.SseEmitterService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final SseEmitterService sseEmitterService;
    private final AuthModuleApi authModuleApi;

    public NotificationController(NotificationService notificationService, SseEmitterService sseEmitterService,
                                  AuthModuleApi authModuleApi) {
        this.notificationService = notificationService;
        this.sseEmitterService = sseEmitterService;
        this.authModuleApi = authModuleApi;
    }

    private AuthUser requireCurrentUser() {
        return authModuleApi.getCurrentUser()
                .orElseThrow(() -> new IllegalStateException("No authenticated user"));
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> getNotifications() {
        var user = requireCurrentUser();
        return ResponseEntity.ok(notificationService.getNotifications(user.id()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id) {
        var user = requireCurrentUser();
        notificationService.markAsRead(id, user.id());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead() {
        var user = requireCurrentUser();
        notificationService.markAllAsRead(user.id());
        return ResponseEntity.ok().build();
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream() {
        var user = requireCurrentUser();
        return sseEmitterService.createEmitter(user.id());
    }
}
