package net.voldrich.myhome.backend.notification.internal.dto;

import java.time.OffsetDateTime;

public record SseNotificationPayload(
        Long id,
        String type,
        String title,
        String message,
        String data,
        OffsetDateTime createdAt
) {}
