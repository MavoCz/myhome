package net.voldrich.template.backend_spring.auth.internal.repository;

import net.voldrich.template.backend_spring.auth.FamilyRole;
import net.voldrich.template.backend_spring.jooq.tables.FamilyMembers;
import net.voldrich.template.backend_spring.jooq.tables.Users;
import net.voldrich.template.backend_spring.jooq.tables.records.FamilyMembersRecord;
import org.jooq.DSLContext;
import org.jooq.Record5;
import org.jooq.Result;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class FamilyMemberRepository {

    private static final FamilyMembers FM = FamilyMembers.FAMILY_MEMBERS;
    private static final Users USERS = Users.USERS;
    private final DSLContext dsl;

    public FamilyMemberRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public FamilyMembersRecord create(Long familyId, Long userId, FamilyRole role) {
        return dsl.insertInto(FM)
                .set(FM.FAMILY_ID, familyId)
                .set(FM.USER_ID, userId)
                .set(FM.ROLE, role.name())
                .returning()
                .fetchOne();
    }

    public Optional<FamilyMembersRecord> findByFamilyAndUser(Long familyId, Long userId) {
        return dsl.selectFrom(FM)
                .where(FM.FAMILY_ID.eq(familyId).and(FM.USER_ID.eq(userId)))
                .fetchOptional();
    }

    public Optional<FamilyMembersRecord> findFirstByUserId(Long userId) {
        return dsl.selectFrom(FM)
                .where(FM.USER_ID.eq(userId))
                .fetchOptional();
    }

    public Result<Record5<Long, String, String, String, Long>> findMembersWithUserInfo(Long familyId) {
        return dsl.select(USERS.ID, USERS.EMAIL, USERS.DISPLAY_NAME, FM.ROLE, FM.FAMILY_ID)
                .from(FM)
                .join(USERS).on(FM.USER_ID.eq(USERS.ID))
                .where(FM.FAMILY_ID.eq(familyId))
                .fetch();
    }

    public void deleteByFamilyAndUser(Long familyId, Long userId) {
        dsl.deleteFrom(FM)
                .where(FM.FAMILY_ID.eq(familyId).and(FM.USER_ID.eq(userId)))
                .execute();
    }

    public void updateRole(Long familyId, Long userId, FamilyRole role) {
        dsl.update(FM)
                .set(FM.ROLE, role.name())
                .where(FM.FAMILY_ID.eq(familyId).and(FM.USER_ID.eq(userId)))
                .execute();
    }
}
