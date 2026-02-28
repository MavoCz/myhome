package net.voldrich.myhome.backend.expenses.internal.service;

import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.expenses.internal.dto.BalanceResponse;
import net.voldrich.myhome.backend.jooq.tables.Expenses;
import net.voldrich.myhome.backend.jooq.tables.ExpenseSplits;
import net.voldrich.myhome.backend.jooq.tables.Users;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class BalanceService {

    private static final Expenses EXP = Expenses.EXPENSES;
    private static final ExpenseSplits ES = ExpenseSplits.EXPENSE_SPLITS;
    private static final Users USERS = Users.USERS;

    private final DSLContext dsl;
    private final AuthModuleApi authModuleApi;

    public BalanceService(DSLContext dsl, AuthModuleApi authModuleApi) {
        this.dsl = dsl;
        this.authModuleApi = authModuleApi;
    }

    public List<BalanceResponse> getBalances(Long familyId) {
        var members = authModuleApi.getFamilyMembers(familyId);
        Map<Long, String> nameMap = members.stream()
                .collect(Collectors.toMap(AuthUser::id, AuthUser::displayName));

        // Total paid per user (as payer)
        var paid = dsl.select(EXP.PAID_BY_USER_ID, DSL.sum(EXP.CZK_AMOUNT).as("total_paid"))
                .from(EXP)
                .where(EXP.FAMILY_ID.eq(familyId).and(EXP.DELETED_AT.isNull()))
                .groupBy(EXP.PAID_BY_USER_ID)
                .fetch()
                .stream()
                .collect(Collectors.toMap(
                        r -> r.get(EXP.PAID_BY_USER_ID),
                        r -> r.get("total_paid", BigDecimal.class)
                ));

        // Total owed per user (from splits)
        var owed = dsl.select(ES.USER_ID, DSL.sum(ES.CZK_AMOUNT).as("total_owed"))
                .from(ES)
                .join(EXP).on(ES.EXPENSE_ID.eq(EXP.ID))
                .where(EXP.FAMILY_ID.eq(familyId).and(EXP.DELETED_AT.isNull()))
                .groupBy(ES.USER_ID)
                .fetch()
                .stream()
                .collect(Collectors.toMap(
                        r -> r.get(ES.USER_ID),
                        r -> r.get("total_owed", BigDecimal.class)
                ));

        List<BalanceResponse> result = new ArrayList<>();
        for (var member : members) {
            Long userId = member.id();
            BigDecimal totalPaid = paid.getOrDefault(userId, BigDecimal.ZERO);
            BigDecimal totalOwed = owed.getOrDefault(userId, BigDecimal.ZERO);
            BigDecimal net = totalPaid.subtract(totalOwed);
            result.add(new BalanceResponse(userId, nameMap.get(userId), totalPaid, totalOwed, net));
        }
        return result;
    }
}
