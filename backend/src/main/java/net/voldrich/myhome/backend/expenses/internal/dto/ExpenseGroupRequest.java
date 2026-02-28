package net.voldrich.myhome.backend.expenses.internal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ExpenseGroupRequest(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description,
        LocalDate startDate,
        LocalDate endDate,
        Boolean allowChildren
) {}
