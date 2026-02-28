package net.voldrich.myhome.backend.expenses.internal.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SplitEntry(
        @NotNull Long userId,
        @NotNull @DecimalMin("0.01") @DecimalMax("100.00") BigDecimal sharePct
) {}
