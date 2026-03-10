package net.voldrich.myhome.backend.expenses;

import java.math.BigDecimal;

public record ExpenseAddedEvent(
        Long familyId,
        Long expenseId,
        String description,
        BigDecimal originalAmount,
        String originalCurrency,
        BigDecimal czkAmount,
        Long paidByUserId,
        String paidByDisplayName,
        Long createdByUserId,
        String createdByDisplayName
) {}
