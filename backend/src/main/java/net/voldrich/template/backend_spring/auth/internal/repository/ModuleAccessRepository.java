package net.voldrich.template.backend_spring.auth.internal.repository;

import net.voldrich.template.backend_spring.jooq.tables.ModuleAccess;
import net.voldrich.template.backend_spring.jooq.tables.ModuleAccessSchedules;
import net.voldrich.template.backend_spring.jooq.tables.records.ModuleAccessRecord;
import net.voldrich.template.backend_spring.jooq.tables.records.ModuleAccessSchedulesRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ModuleAccessRepository {

    private static final ModuleAccess MA = ModuleAccess.MODULE_ACCESS;
    private static final ModuleAccessSchedules MAS = ModuleAccessSchedules.MODULE_ACCESS_SCHEDULES;
    private final DSLContext dsl;

    public ModuleAccessRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public ModuleAccessRecord create(Long familyId, Long userId, String moduleName, String permission,
                                     OffsetDateTime validFrom, OffsetDateTime validUntil, Long grantedBy) {
        return dsl.insertInto(MA)
                .set(MA.FAMILY_ID, familyId)
                .set(MA.USER_ID, userId)
                .set(MA.MODULE_NAME, moduleName)
                .set(MA.PERMISSION, permission)
                .set(MA.VALID_FROM, validFrom)
                .set(MA.VALID_UNTIL, validUntil)
                .set(MA.GRANTED_BY, grantedBy)
                .returning()
                .fetchOne();
    }

    public Optional<ModuleAccessRecord> findById(Long id) {
        return dsl.selectFrom(MA)
                .where(MA.ID.eq(id))
                .fetchOptional();
    }

    public List<ModuleAccessRecord> findByFamilyAndUser(Long familyId, Long userId) {
        return dsl.selectFrom(MA)
                .where(MA.FAMILY_ID.eq(familyId).and(MA.USER_ID.eq(userId)))
                .fetchInto(ModuleAccessRecord.class);
    }

    public List<ModuleAccessRecord> findByUserAndModule(Long userId, Long familyId, String moduleName) {
        return dsl.selectFrom(MA)
                .where(MA.USER_ID.eq(userId)
                        .and(MA.FAMILY_ID.eq(familyId))
                        .and(MA.MODULE_NAME.eq(moduleName)))
                .fetchInto(ModuleAccessRecord.class);
    }

    public void update(Long id, String permission, OffsetDateTime validFrom, OffsetDateTime validUntil) {
        dsl.update(MA)
                .set(MA.PERMISSION, permission)
                .set(MA.VALID_FROM, validFrom)
                .set(MA.VALID_UNTIL, validUntil)
                .set(MA.UPDATED_AT, OffsetDateTime.now())
                .where(MA.ID.eq(id))
                .execute();
    }

    public void deleteById(Long id) {
        dsl.deleteFrom(MA)
                .where(MA.ID.eq(id))
                .execute();
    }

    public void createSchedule(Long moduleAccessId, int dayOfWeek, LocalTime startTime, LocalTime endTime, String timezone) {
        dsl.insertInto(MAS)
                .set(MAS.MODULE_ACCESS_ID, moduleAccessId)
                .set(MAS.DAY_OF_WEEK, (short) dayOfWeek)
                .set(MAS.START_TIME, startTime)
                .set(MAS.END_TIME, endTime)
                .set(MAS.TIMEZONE, timezone)
                .execute();
    }

    public List<ModuleAccessSchedulesRecord> findSchedulesByAccessId(Long moduleAccessId) {
        return dsl.selectFrom(MAS)
                .where(MAS.MODULE_ACCESS_ID.eq(moduleAccessId))
                .fetchInto(ModuleAccessSchedulesRecord.class);
    }

    public void deleteSchedulesByAccessId(Long moduleAccessId) {
        dsl.deleteFrom(MAS)
                .where(MAS.MODULE_ACCESS_ID.eq(moduleAccessId))
                .execute();
    }
}
