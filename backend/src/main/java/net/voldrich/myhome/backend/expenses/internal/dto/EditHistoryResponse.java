package net.voldrich.myhome.backend.expenses.internal.dto;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record EditHistoryResponse(
        Long id,
        Long editedByUserId,
        String editedByDisplayName,
        Map<String, List<String>> changedFields,
        OffsetDateTime editedAt
) {}
