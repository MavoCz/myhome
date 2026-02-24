package net.voldrich.template.backend_spring.notification.internal.dto;

import java.time.OffsetDateTime;

public record NotificationResponse(
        Long id,
        String type,
        String title,
        String message,
        String data,
        boolean read,
        OffsetDateTime createdAt
) {}
