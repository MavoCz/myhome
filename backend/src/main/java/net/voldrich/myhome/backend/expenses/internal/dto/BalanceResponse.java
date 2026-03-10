package net.voldrich.myhome.backend.expenses.internal.dto;

import java.math.BigDecimal;

public record BalanceResponse(
        Long userId,
        String displayName,
        BigDecimal totalPaidCzk,
        BigDecimal totalOwedCzk,
        BigDecimal netBalanceCzk
) {}
