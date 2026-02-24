package net.voldrich.template.backend_spring.notification.internal.config;

import net.voldrich.template.backend_spring.notification.internal.service.SseEmitterService;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration
@EnableScheduling
public class NotificationConfig {

    private final SseEmitterService sseEmitterService;

    public NotificationConfig(SseEmitterService sseEmitterService) {
        this.sseEmitterService = sseEmitterService;
    }

    @Scheduled(fixedRate = 30000)
    public void sendHeartbeat() {
        sseEmitterService.sendHeartbeat();
    }
}
