package net.voldrich.myhome.backend.expenses.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.Expenses;
import net.voldrich.myhome.backend.jooq.tables.records.ExpensesRecord;
import org.jooq.Condition;
import org.jooq.DSLContext;
import org.jooq.impl.DSL;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ExpenseRepository {

    private static final Expenses EXP = Expenses.EXPENSES;
    private final DSLContext dsl;

    public ExpenseRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ExpensesRecord> findByFamily(Long familyId, Long groupId, List<Long> allowedGroupIds, Integer year, Integer month, int offset, int size) {
        Condition condition = EXP.FAMILY_ID.eq(familyId).and(EXP.DELETED_AT.isNull());
        if (groupId != null) {
            condition = condition.and(EXP.GROUP_ID.eq(groupId));
        } else if (allowedGroupIds != null) {
            condition = condition.and(EXP.GROUP_ID.in(allowedGroupIds));
        }
        if (year != null && month != null) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.plusMonths(1);
            condition = condition.and(EXP.EXPENSE_DATE.ge(start).and(EXP.EXPENSE_DATE.lt(end)));
        } else if (year != null) {
            LocalDate start = LocalDate.of(year, 1, 1);
            LocalDate end = start.plusYears(1);
            condition = condition.and(EXP.EXPENSE_DATE.ge(start).and(EXP.EXPENSE_DATE.lt(end)));
        }
        return dsl.selectFrom(EXP)
                .where(condition)
                .orderBy(EXP.EXPENSE_DATE.desc(), EXP.CREATED_AT.desc())
                .limit(size)
                .offset(offset)
                .fetch();
    }

    public int countByFamily(Long familyId, Long groupId, List<Long> allowedGroupIds, Integer year, Integer month) {
        Condition condition = EXP.FAMILY_ID.eq(familyId).and(EXP.DELETED_AT.isNull());
        if (groupId != null) {
            condition = condition.and(EXP.GROUP_ID.eq(groupId));
        } else if (allowedGroupIds != null) {
            condition = condition.and(EXP.GROUP_ID.in(allowedGroupIds));
        }
        if (year != null && month != null) {
            LocalDate start = LocalDate.of(year, month, 1);
            LocalDate end = start.plusMonths(1);
            condition = condition.and(EXP.EXPENSE_DATE.ge(start).and(EXP.EXPENSE_DATE.lt(end)));
        }
        return dsl.fetchCount(dsl.selectFrom(EXP).where(condition));
    }

    public Optional<ExpensesRecord> findById(Long id) {
        return dsl.selectFrom(EXP).where(EXP.ID.eq(id)).fetchOptional();
    }

    public ExpensesRecord create(Long familyId, Long groupId, String description,
                                 BigDecimal originalAmount, String originalCurrency,
                                 BigDecimal czkAmount, BigDecimal exchangeRate,
                                 OffsetDateTime rateFetchedAt, LocalDate date,
                                 Long paidByUserId, Long createdByUserId) {
        return dsl.insertInto(EXP)
                .set(EXP.FAMILY_ID, familyId)
                .set(EXP.GROUP_ID, groupId)
                .set(EXP.DESCRIPTION, description)
                .set(EXP.ORIGINAL_AMOUNT, originalAmount)
                .set(EXP.ORIGINAL_CURRENCY, originalCurrency)
                .set(EXP.CZK_AMOUNT, czkAmount)
                .set(EXP.EXCHANGE_RATE, exchangeRate)
                .set(EXP.RATE_FETCHED_AT, rateFetchedAt)
                .set(EXP.EXPENSE_DATE, date)
                .set(EXP.PAID_BY_USER_ID, paidByUserId)
                .set(EXP.CREATED_BY_USER_ID, createdByUserId)
                .set(EXP.CREATED_AT, OffsetDateTime.now())
                .set(EXP.UPDATED_AT, OffsetDateTime.now())
                .returning()
                .fetchOne();
    }

    public Optional<ExpensesRecord> update(Long id, Long familyId, Long groupId, String description,
                                           BigDecimal originalAmount, String originalCurrency,
                                           BigDecimal czkAmount, BigDecimal exchangeRate,
                                           OffsetDateTime rateFetchedAt, LocalDate date) {
        int updated = dsl.update(EXP)
                .set(EXP.GROUP_ID, groupId)
                .set(EXP.DESCRIPTION, description)
                .set(EXP.ORIGINAL_AMOUNT, originalAmount)
                .set(EXP.ORIGINAL_CURRENCY, originalCurrency)
                .set(EXP.CZK_AMOUNT, czkAmount)
                .set(EXP.EXCHANGE_RATE, exchangeRate)
                .set(EXP.RATE_FETCHED_AT, rateFetchedAt)
                .set(EXP.EXPENSE_DATE, date)
                .set(EXP.UPDATED_AT, OffsetDateTime.now())
                .where(EXP.ID.eq(id).and(EXP.FAMILY_ID.eq(familyId)))
                .execute();
        if (updated == 0) return Optional.empty();
        return findById(id);
    }

    public boolean softDelete(Long id, Long familyId, OffsetDateTime deletedAt) {
        return dsl.update(EXP)
                .set(EXP.DELETED_AT, deletedAt)
                .set(EXP.UPDATED_AT, OffsetDateTime.now())
                .where(EXP.ID.eq(id).and(EXP.FAMILY_ID.eq(familyId)).and(EXP.DELETED_AT.isNull()))
                .execute() > 0;
    }

    public boolean restore(Long id, Long familyId) {
        return dsl.update(EXP)
                .set(EXP.DELETED_AT, (OffsetDateTime) null)
                .set(EXP.UPDATED_AT, OffsetDateTime.now())
                .where(EXP.ID.eq(id).and(EXP.FAMILY_ID.eq(familyId)).and(EXP.DELETED_AT.isNotNull()))
                .execute() > 0;
    }

    public List<ExpensesRecord> findByFamilyAndMonth(Long familyId, int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.plusMonths(1);
        return dsl.selectFrom(EXP)
                .where(EXP.FAMILY_ID.eq(familyId)
                        .and(EXP.DELETED_AT.isNull())
                        .and(EXP.EXPENSE_DATE.ge(start))
                        .and(EXP.EXPENSE_DATE.lt(end)))
                .orderBy(EXP.EXPENSE_DATE.desc())
                .fetch();
    }
}
