package net.voldrich.myhome.backend.expenses.internal.dto;

import java.math.BigDecimal;

public record GroupSplitResponse(
        Long userId,
        String displayName,
        BigDecimal sharePct
) {}
