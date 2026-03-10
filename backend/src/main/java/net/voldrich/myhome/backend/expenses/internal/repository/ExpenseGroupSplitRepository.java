package net.voldrich.myhome.backend.expenses.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.ExpenseGroupSplits;
import net.voldrich.myhome.backend.jooq.tables.Users;
import net.voldrich.myhome.backend.jooq.tables.records.ExpenseGroupSplitsRecord;
import org.jooq.DSLContext;
import org.jooq.Record3;
import org.jooq.Result;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public class ExpenseGroupSplitRepository {

    private static final ExpenseGroupSplits EGS = ExpenseGroupSplits.EXPENSE_GROUP_SPLITS;
    private static final Users USERS = Users.USERS;
    private final DSLContext dsl;

    public ExpenseGroupSplitRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Result<Record3<Long, String, BigDecimal>> findByGroupIdWithNames(Long groupId) {
        return dsl.select(USERS.ID, USERS.DISPLAY_NAME, EGS.SHARE_PCT)
                .from(EGS)
                .join(USERS).on(EGS.USER_ID.eq(USERS.ID))
                .where(EGS.GROUP_ID.eq(groupId))
                .fetch();
    }

    public List<ExpenseGroupSplitsRecord> findByGroupId(Long groupId) {
        return dsl.selectFrom(EGS)
                .where(EGS.GROUP_ID.eq(groupId))
                .fetch();
    }

    public void deleteByGroupId(Long groupId) {
        dsl.deleteFrom(EGS)
                .where(EGS.GROUP_ID.eq(groupId))
                .execute();
    }

    public void create(Long groupId, Long userId, BigDecimal sharePct) {
        dsl.insertInto(EGS)
                .set(EGS.GROUP_ID, groupId)
                .set(EGS.USER_ID, userId)
                .set(EGS.SHARE_PCT, sharePct)
                .execute();
    }
}
