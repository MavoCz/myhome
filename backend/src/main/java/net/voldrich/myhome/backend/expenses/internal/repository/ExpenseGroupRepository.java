package net.voldrich.myhome.backend.expenses.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.Expenses;
import net.voldrich.myhome.backend.jooq.tables.ExpenseGroups;
import net.voldrich.myhome.backend.jooq.tables.records.ExpenseGroupsRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ExpenseGroupRepository {

    private static final ExpenseGroups EG = ExpenseGroups.EXPENSE_GROUPS;
    private static final Expenses EXP = Expenses.EXPENSES;
    private final DSLContext dsl;

    public ExpenseGroupRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ExpenseGroupsRecord> findByFamilyId(Long familyId) {
        return dsl.selectFrom(EG)
                .where(EG.FAMILY_ID.eq(familyId))
                .orderBy(EG.IS_DEFAULT.desc(), EG.NAME.asc())
                .fetch();
    }

    public Optional<ExpenseGroupsRecord> findById(Long id) {
        return dsl.selectFrom(EG)
                .where(EG.ID.eq(id))
                .fetchOptional();
    }

    public ExpenseGroupsRecord create(Long familyId, String name, String description, LocalDate startDate, LocalDate endDate, boolean isDefault) {
        return dsl.insertInto(EG)
                .set(EG.FAMILY_ID, familyId)
                .set(EG.NAME, name)
                .set(EG.DESCRIPTION, description)
                .set(EG.START_DATE, startDate)
                .set(EG.END_DATE, endDate)
                .set(EG.IS_DEFAULT, isDefault)
                .set(EG.ARCHIVED, false)
                .set(EG.CREATED_AT, OffsetDateTime.now())
                .set(EG.UPDATED_AT, OffsetDateTime.now())
                .returning()
                .fetchOne();
    }

    public Optional<ExpenseGroupsRecord> update(Long id, Long familyId, String name, String description, LocalDate startDate, LocalDate endDate) {
        int updated = dsl.update(EG)
                .set(EG.NAME, name)
                .set(EG.DESCRIPTION, description)
                .set(EG.START_DATE, startDate)
                .set(EG.END_DATE, endDate)
                .set(EG.UPDATED_AT, OffsetDateTime.now())
                .where(EG.ID.eq(id).and(EG.FAMILY_ID.eq(familyId)))
                .execute();
        if (updated == 0) return Optional.empty();
        return findById(id);
    }

    public boolean archive(Long id, Long familyId) {
        return dsl.update(EG)
                .set(EG.ARCHIVED, true)
                .set(EG.UPDATED_AT, OffsetDateTime.now())
                .where(EG.ID.eq(id).and(EG.FAMILY_ID.eq(familyId)))
                .execute() > 0;
    }

    public boolean delete(Long id, Long familyId) {
        return dsl.deleteFrom(EG)
                .where(EG.ID.eq(id).and(EG.FAMILY_ID.eq(familyId)))
                .execute() > 0;
    }

    public boolean existsByFamilyIdAndName(Long familyId, String name) {
        return dsl.fetchExists(
                dsl.selectFrom(EG)
                        .where(EG.FAMILY_ID.eq(familyId)
                                .and(EG.NAME.equalIgnoreCase(name)))
        );
    }

    public boolean existsByFamilyIdAndNameExcluding(Long familyId, String name, Long excludeId) {
        return dsl.fetchExists(
                dsl.selectFrom(EG)
                        .where(EG.FAMILY_ID.eq(familyId)
                                .and(EG.NAME.equalIgnoreCase(name))
                                .and(EG.ID.ne(excludeId)))
        );
    }

    public boolean hasExpenses(Long groupId) {
        return dsl.fetchExists(
                dsl.selectFrom(EXP)
                        .where(EXP.GROUP_ID.eq(groupId))
        );
    }
}
