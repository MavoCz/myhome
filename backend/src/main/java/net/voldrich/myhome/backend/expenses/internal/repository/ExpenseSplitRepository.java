package net.voldrich.myhome.backend.expenses.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.ExpenseSplits;
import net.voldrich.myhome.backend.jooq.tables.Users;
import net.voldrich.myhome.backend.jooq.tables.records.ExpenseSplitsRecord;
import org.jooq.DSLContext;
import org.jooq.Record4;
import org.jooq.Result;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class ExpenseSplitRepository {

    private static final ExpenseSplits ES = ExpenseSplits.EXPENSE_SPLITS;
    private static final Users USERS = Users.USERS;
    private final DSLContext dsl;

    public ExpenseSplitRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Result<Record4<Long, Long, String, BigDecimal>> findByExpenseIdWithNames(Long expenseId) {
        return dsl.select(ES.ID, USERS.ID, USERS.DISPLAY_NAME, ES.SHARE_PCT)
                .from(ES)
                .join(USERS).on(ES.USER_ID.eq(USERS.ID))
                .where(ES.EXPENSE_ID.eq(expenseId))
                .fetch();
    }

    public Result<Record4<Long, Long, BigDecimal, BigDecimal>> findByExpenseIdWithAmounts(Long expenseId) {
        return dsl.select(ES.USER_ID, USERS.ID, ES.SHARE_PCT, ES.CZK_AMOUNT)
                .from(ES)
                .join(USERS).on(ES.USER_ID.eq(USERS.ID))
                .where(ES.EXPENSE_ID.eq(expenseId))
                .fetch();
    }

    public List<ExpenseSplitsRecord> findByExpenseId(Long expenseId) {
        return dsl.selectFrom(ES).where(ES.EXPENSE_ID.eq(expenseId)).fetch();
    }

    public void deleteByExpenseId(Long expenseId) {
        dsl.deleteFrom(ES).where(ES.EXPENSE_ID.eq(expenseId)).execute();
    }

    public void create(Long expenseId, Long userId, BigDecimal sharePct, BigDecimal czkAmount) {
        dsl.insertInto(ES)
                .set(ES.EXPENSE_ID, expenseId)
                .set(ES.USER_ID, userId)
                .set(ES.SHARE_PCT, sharePct)
                .set(ES.CZK_AMOUNT, czkAmount)
                .execute();
    }
}
