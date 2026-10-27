package net.voldrich.myhome.backend.learning.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.LearningZoos;
import net.voldrich.myhome.backend.jooq.tables.records.LearningZoosRecord;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class LearningZooRepository {

    private static final LearningZoos LZ = LearningZoos.LEARNING_ZOOS;
    private final DSLContext dsl;

    public LearningZooRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Optional<LearningZoosRecord> find(Long familyId, Long userId) {
        return dsl.selectFrom(LZ)
                .where(LZ.FAMILY_ID.eq(familyId).and(LZ.USER_ID.eq(userId)))
                .fetchOptional();
    }

    public List<LearningZoosRecord> findByFamilyId(Long familyId) {
        return dsl.selectFrom(LZ)
                .where(LZ.FAMILY_ID.eq(familyId))
                .fetch();
    }

    /** Creates the zoo with version 1; returns false if it already exists. */
    public boolean insert(Long familyId, Long userId, String stateJson) {
        return dsl.insertInto(LZ)
                .set(LZ.FAMILY_ID, familyId)
                .set(LZ.USER_ID, userId)
                .set(LZ.STATE, JSONB.jsonb(stateJson))
                .set(LZ.VERSION, 1L)
                .set(LZ.CREATED_AT, OffsetDateTime.now())
                .set(LZ.UPDATED_AT, OffsetDateTime.now())
                .onConflictDoNothing()
                .execute() > 0;
    }

    /** Replaces the state only if the stored version is still {@code expectedVersion}. */
    public boolean updateIfVersion(Long familyId, Long userId, String stateJson, long expectedVersion) {
        return dsl.update(LZ)
                .set(LZ.STATE, JSONB.jsonb(stateJson))
                .set(LZ.VERSION, expectedVersion + 1)
                .set(LZ.UPDATED_AT, OffsetDateTime.now())
                .where(LZ.FAMILY_ID.eq(familyId)
                        .and(LZ.USER_ID.eq(userId))
                        .and(LZ.VERSION.eq(expectedVersion)))
                .execute() > 0;
    }

    public void delete(Long familyId, Long userId) {
        dsl.deleteFrom(LZ)
                .where(LZ.FAMILY_ID.eq(familyId).and(LZ.USER_ID.eq(userId)))
                .execute();
    }
}
