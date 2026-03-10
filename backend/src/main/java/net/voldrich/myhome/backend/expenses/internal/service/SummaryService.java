package net.voldrich.myhome.backend.expenses.internal.service;

import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.expenses.internal.dto.MonthlySummaryResponse;
import net.voldrich.myhome.backend.expenses.internal.repository.ExpenseRepository;
import net.voldrich.myhome.backend.expenses.internal.repository.ExpenseSplitRepository;
import net.voldrich.myhome.backend.expenses.internal.repository.ExpenseGroupRepository;
import net.voldrich.myhome.backend.jooq.tables.records.ExpenseSplitsRecord;
import net.voldrich.myhome.backend.jooq.tables.records.ExpensesRecord;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SummaryService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository splitRepository;
    private final ExpenseGroupRepository groupRepository;
    private final AuthModuleApi authModuleApi;

    public SummaryService(ExpenseRepository expenseRepository,
                          ExpenseSplitRepository splitRepository,
                          ExpenseGroupRepository groupRepository,
                          AuthModuleApi authModuleApi) {
        this.expenseRepository = expenseRepository;
        this.splitRepository = splitRepository;
        this.groupRepository = groupRepository;
        this.authModuleApi = authModuleApi;
    }

    public MonthlySummaryResponse getMonthlySummary(Long familyId, int year, int month) {
        var expenses = expenseRepository.findByFamilyAndMonth(familyId, year, month);
        var members = authModuleApi.getFamilyMembers(familyId);
        Map<Long, String> nameMap = members.stream()
                .collect(Collectors.toMap(AuthUser::id, AuthUser::displayName));

        // Totals
        BigDecimal totalCzk = expenses.stream()
                .map(ExpensesRecord::getCzkAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // By group with per-member breakdown
        Map<Long, Map<Long, BigDecimal>> byGroupByMember = new LinkedHashMap<>();
        for (var e : expenses) {
            byGroupByMember
                    .computeIfAbsent(e.getGroupId(), k -> new HashMap<>())
                    .merge(e.getPaidByUserId(), e.getCzkAmount(), BigDecimal::add);
        }
        var byGroup = byGroupByMember.entrySet().stream()
                .map(entry -> {
                    Long groupId = entry.getKey();
                    var grp = groupRepository.findById(groupId).orElse(null);
                    String name = grp != null ? grp.getName() : "Unknown";
                    BigDecimal groupTotal = entry.getValue().values().stream()
                            .reduce(BigDecimal.ZERO, BigDecimal::add);
                    List<MonthlySummaryResponse.GroupMemberPaid> memberPaid = entry.getValue().entrySet().stream()
                            .map(me -> new MonthlySummaryResponse.GroupMemberPaid(
                                    me.getKey(), nameMap.getOrDefault(me.getKey(), "Unknown"), me.getValue()))
                            .sorted(Comparator.comparing(MonthlySummaryResponse.GroupMemberPaid::paidCzk).reversed())
                            .toList();
                    return new MonthlySummaryResponse.GroupSummary(groupId, name, groupTotal, memberPaid);
                })
                .sorted(Comparator.comparing(MonthlySummaryResponse.GroupSummary::totalCzk).reversed())
                .toList();

        // Member paid totals
        Map<Long, BigDecimal> paidByMember = new HashMap<>();
        for (var e : expenses) {
            paidByMember.merge(e.getPaidByUserId(), e.getCzkAmount(), BigDecimal::add);
        }

        // Member owed totals (from splits)
        Map<Long, BigDecimal> owedByMember = new HashMap<>();
        for (var e : expenses) {
            var splits = splitRepository.findByExpenseId(e.getId());
            for (ExpenseSplitsRecord s : splits) {
                owedByMember.merge(s.getUserId(), s.getCzkAmount(), BigDecimal::add);
            }
        }

        List<MonthlySummaryResponse.MemberTotals> memberTotals = members.stream()
                .map(m -> {
                    BigDecimal paid = paidByMember.getOrDefault(m.id(), BigDecimal.ZERO);
                    BigDecimal owed = owedByMember.getOrDefault(m.id(), BigDecimal.ZERO);
                    return new MonthlySummaryResponse.MemberTotals(m.id(), nameMap.get(m.id()), paid, owed, paid.subtract(owed));
                })
                .toList();

        // Debt simplification
        var settlementPlan = simplifyDebts(memberTotals, nameMap);

        return new MonthlySummaryResponse(year, month, totalCzk, byGroup, memberTotals, settlementPlan);
    }

    private List<MonthlySummaryResponse.SettlementEntry> simplifyDebts(
            List<MonthlySummaryResponse.MemberTotals> memberTotals,
            Map<Long, String> nameMap) {

        // Separate creditors (net > 0) and debtors (net < 0)
        List<long[]> creditors = new ArrayList<>(); // [userId, amountMillis]
        List<long[]> debtors = new ArrayList<>();

        for (var m : memberTotals) {
            long netMillis = m.netCzk().multiply(new BigDecimal("1000")).longValue();
            if (netMillis > 0) {
                creditors.add(new long[]{m.userId(), netMillis});
            } else if (netMillis < 0) {
                debtors.add(new long[]{m.userId(), -netMillis});
            }
        }

        // Sort descending by amount
        creditors.sort((a, b) -> Long.compare(b[1], a[1]));
        debtors.sort((a, b) -> Long.compare(b[1], a[1]));

        List<MonthlySummaryResponse.SettlementEntry> plan = new ArrayList<>();
        int ci = 0, di = 0;

        while (ci < creditors.size() && di < debtors.size()) {
            long creditorId = creditors.get(ci)[0];
            long debtorId = debtors.get(di)[0];
            long credAmt = creditors.get(ci)[1];
            long debtAmt = debtors.get(di)[1];

            long transfer = Math.min(credAmt, debtAmt);
            BigDecimal amount = new BigDecimal(transfer).divide(new BigDecimal("1000"), 2, java.math.RoundingMode.HALF_UP);

            plan.add(new MonthlySummaryResponse.SettlementEntry(
                    debtorId, nameMap.getOrDefault(debtorId, "Unknown"),
                    creditorId, nameMap.getOrDefault(creditorId, "Unknown"),
                    amount
            ));

            creditors.get(ci)[1] -= transfer;
            debtors.get(di)[1] -= transfer;
            if (creditors.get(ci)[1] == 0) ci++;
            if (debtors.get(di)[1] == 0) di++;
        }

        return plan;
    }
}
