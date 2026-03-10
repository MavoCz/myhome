package net.voldrich.myhome.backend.expenses.internal.dto;

import java.math.BigDecimal;

public record ExpenseSplitResponse(
        Long userId,
        String displayName,
        BigDecimal sharePct,
        BigDecimal czkAmount
) {}
