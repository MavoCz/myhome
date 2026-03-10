package net.voldrich.myhome.backend.expenses.internal.dto;

import java.util.List;

public record SplitConfigResponse(
        Long groupId,
        List<GroupSplitResponse> splits
) {}
