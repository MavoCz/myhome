package net.voldrich.myhome.backend.expenses.internal.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

public record ExpenseResponse(
        Long id,
        String description,
        BigDecimal originalAmount,
        String originalCurrency,
        BigDecimal czkAmount,
        BigDecimal exchangeRate,
        OffsetDateTime rateFetchedAt,
        LocalDate date,
        UserRef paidBy,
        GroupRef group,
        List<ExpenseSplitResponse> splits,
        Long createdBy,
        OffsetDateTime createdAt,
        OffsetDateTime deletedAt,
        boolean canEdit
) {
    public record UserRef(Long userId, String displayName) {}
    public record GroupRef(Long id, String name) {}
}
