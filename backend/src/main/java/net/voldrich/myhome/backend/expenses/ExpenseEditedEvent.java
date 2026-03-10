package net.voldrich.myhome.backend.expenses;

public record ExpenseEditedEvent(
        Long familyId,
        Long expenseId,
        String description,
        Long editedByUserId,
        String editedByDisplayName
) {}
