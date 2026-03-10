package net.voldrich.myhome.backend.expenses.internal.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record ExchangeRateResponse(
        String currencyCode,
        BigDecimal rateToCzk,
        OffsetDateTime fetchedAt
) {}
