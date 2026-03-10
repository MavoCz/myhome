package net.voldrich.myhome.backend.expenses;

import java.math.BigDecimal;

public record ExpenseDeletedEvent(
        Long familyId,
        Long expenseId,
        String description,
        BigDecimal czkAmount,
        Long deletedByUserId,
        String deletedByDisplayName
) {}
