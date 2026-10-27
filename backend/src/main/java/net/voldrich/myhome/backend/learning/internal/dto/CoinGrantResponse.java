package net.voldrich.myhome.backend.learning.internal.dto;

import java.time.OffsetDateTime;

public record CoinGrantResponse(
        Long id,
        Long userId,
        int amount,
        String note,
        OffsetDateTime createdAt,
        OffsetDateTime claimedAt
) {}
