package net.voldrich.myhome.backend.expenses.internal.dto;

import java.time.LocalDate;
import java.util.List;

public record ExpenseGroupResponse(
        Long id,
        String name,
        String description,
        LocalDate startDate,
        LocalDate endDate,
        boolean archived,
        boolean isDefault,
        boolean allowChildren,
        List<GroupSplitResponse> splits
) {}
