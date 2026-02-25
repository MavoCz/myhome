package net.voldrich.myhome.backend.notification.internal.service;

import net.voldrich.myhome.backend.notification.NotificationModuleApi;
import net.voldrich.myhome.backend.notification.NotificationType;
import net.voldrich.myhome.backend.notification.internal.dto.NotificationResponse;
import net.voldrich.myhome.backend.notification.internal.dto.SseNotificationPayload;
import net.voldrich.myhome.backend.notification.internal.repository.NotificationRepository;
import org.jooq.JSONB;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificationService implements NotificationModuleApi {

    private final NotificationRepository notificationRepository;
    private final SseEmitterService sseEmitterService;

    public NotificationService(NotificationRepository notificationRepository, SseEmitterService sseEmitterService) {
        this.notificationRepository = notificationRepository;
        this.sseEmitterService = sseEmitterService;
    }

    @Transactional
    public void createAndPush(Long userId, Long familyId, NotificationType type, String title, String message, String data) {
        var record = notificationRepository.create(userId, familyId, type.name(), title, message, data);

        var payload = new SseNotificationPayload(
                record.getId(),
                record.getType(),
                record.getTitle(),
                record.getMessage(),
                jsonbToString(record.getData()),
                record.getCreatedAt()
        );
        sseEmitterService.sendToUser(userId, payload);
    }

    public List<NotificationResponse> getNotifications(Long userId) {
        return notificationRepository.findByUserId(userId).stream()
                .map(r -> new NotificationResponse(
                        r.getId(),
                        r.getType(),
                        r.getTitle(),
                        r.getMessage(),
                        jsonbToString(r.getData()),
                        r.getRead(),
                        r.getCreatedAt()
                ))
                .toList();
    }

    @Transactional
    public void markAsRead(Long id, Long userId) {
        int updated = notificationRepository.markAsRead(id, userId);
        if (updated == 0) {
            throw new IllegalArgumentException("Notification not found");
        }
    }

    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsRead(userId);
    }

    @Override
    public long getUnreadCount(Long userId) {
        return notificationRepository.countUnread(userId);
    }

    private String jsonbToString(JSONB jsonb) {
        return jsonb != null ? jsonb.data() : null;
    }
}
