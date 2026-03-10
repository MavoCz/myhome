package net.voldrich.myhome.backend.expenses.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.ExpenseEditHistory;
import net.voldrich.myhome.backend.jooq.tables.Users;
import net.voldrich.myhome.backend.jooq.tables.records.ExpenseEditHistoryRecord;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.Record5;
import org.jooq.Result;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;

@Repository
public class ExpenseEditHistoryRepository {

    private static final ExpenseEditHistory EEH = ExpenseEditHistory.EXPENSE_EDIT_HISTORY;
    private static final Users USERS = Users.USERS;
    private final DSLContext dsl;

    public ExpenseEditHistoryRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public ExpenseEditHistoryRecord create(Long expenseId, Long editedByUserId, String changedFieldsJson) {
        return dsl.insertInto(EEH)
                .set(EEH.EXPENSE_ID, expenseId)
                .set(EEH.EDITED_BY_USER_ID, editedByUserId)
                .set(EEH.CHANGED_FIELDS, JSONB.jsonb(changedFieldsJson))
                .set(EEH.EDITED_AT, OffsetDateTime.now())
                .returning()
                .fetchOne();
    }

    public Result<Record5<Long, Long, String, JSONB, OffsetDateTime>> findByExpenseIdWithNames(Long expenseId) {
        return dsl.select(EEH.ID, USERS.ID, USERS.DISPLAY_NAME, EEH.CHANGED_FIELDS, EEH.EDITED_AT)
                .from(EEH)
                .join(USERS).on(EEH.EDITED_BY_USER_ID.eq(USERS.ID))
                .where(EEH.EXPENSE_ID.eq(expenseId))
                .orderBy(EEH.EDITED_AT.desc())
                .fetch();
    }
}
