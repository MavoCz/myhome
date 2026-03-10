package net.voldrich.myhome.backend.expenses.internal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import net.voldrich.myhome.backend.expenses.ExpenseCurrency;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record ExpenseRequest(
        @NotBlank @Size(max = 255) String description,
        @NotNull @DecimalMin(value = "0.01") @Digits(integer = 10, fraction = 2) BigDecimal amount,
        @NotNull ExpenseCurrency currency,
        @NotNull LocalDate date,
        @NotNull Long paidByUserId,
        Long groupId,
        @Valid List<SplitEntry> splits
) {}
