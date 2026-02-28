package net.voldrich.myhome.backend.expenses.internal.dto;

import java.math.BigDecimal;
import java.util.List;

public record MonthlySummaryResponse(
        int year,
        int month,
        BigDecimal totalCzk,
        List<GroupSummary> byGroup,
        List<MemberTotals> memberTotals,
        List<SettlementEntry> settlementPlan
) {
    public record GroupSummary(Long groupId, String groupName, BigDecimal totalCzk) {}

    public record MemberTotals(Long userId, String displayName, BigDecimal paidCzk, BigDecimal owedCzk, BigDecimal netCzk) {}

    public record SettlementEntry(Long fromUserId, String fromDisplayName, Long toUserId, String toDisplayName, BigDecimal amountCzk) {}
}
