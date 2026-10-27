package net.voldrich.myhome.backend.learning.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.LearningCoinGrants;
import net.voldrich.myhome.backend.jooq.tables.records.LearningCoinGrantsRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public class CoinGrantRepository {

    private static final LearningCoinGrants LCG = LearningCoinGrants.LEARNING_COIN_GRANTS;
    private final DSLContext dsl;

    public CoinGrantRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public LearningCoinGrantsRecord create(Long familyId, Long userId, int amount, String note, Long grantedBy) {
        return dsl.insertInto(LCG)
                .set(LCG.FAMILY_ID, familyId)
                .set(LCG.USER_ID, userId)
                .set(LCG.AMOUNT, amount)
                .set(LCG.NOTE, note)
                .set(LCG.GRANTED_BY, grantedBy)
                .set(LCG.CREATED_AT, OffsetDateTime.now())
                .returning()
                .fetchOne();
    }

    public List<LearningCoinGrantsRecord> findPending(Long familyId, Long userId) {
        return dsl.selectFrom(LCG)
                .where(LCG.FAMILY_ID.eq(familyId)
                        .and(LCG.USER_ID.eq(userId))
                        .and(LCG.CLAIMED_AT.isNull()))
                .orderBy(LCG.CREATED_AT)
                .fetch();
    }

    public List<LearningCoinGrantsRecord> findRecent(Long familyId, int limit) {
        return dsl.selectFrom(LCG)
                .where(LCG.FAMILY_ID.eq(familyId))
                .orderBy(LCG.CREATED_AT.desc())
                .limit(limit)
                .fetch();
    }

    /** Marks the still-unclaimed grants among {@code ids} as claimed; returns how many were. */
    public int claim(Long familyId, Long userId, Collection<Long> ids) {
        return dsl.update(LCG)
                .set(LCG.CLAIMED_AT, OffsetDateTime.now())
                .where(LCG.FAMILY_ID.eq(familyId)
                        .and(LCG.USER_ID.eq(userId))
                        .and(LCG.ID.in(ids))
                        .and(LCG.CLAIMED_AT.isNull()))
                .execute();
    }

    public void deleteForUser(Long familyId, Long userId) {
        dsl.deleteFrom(LCG)
                .where(LCG.FAMILY_ID.eq(familyId).and(LCG.USER_ID.eq(userId)))
                .execute();
    }
}
