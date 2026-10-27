package net.voldrich.myhome.backend.learning.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.LearningExerciseResults;
import org.jooq.DSLContext;
import org.jooq.JSONB;
import org.jooq.Record5;
import org.jooq.Result;
import org.jooq.impl.DSL;
import org.jooq.impl.SQLDataType;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Repository
public class ExerciseResultRepository {

    private static final LearningExerciseResults LER = LearningExerciseResults.LEARNING_EXERCISE_RESULTS;
    private final DSLContext dsl;

    public ExerciseResultRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    /** Ignores a result whose clientId was already stored, so the app can safely resend its outbox. */
    public void insertIgnoringDuplicates(Long familyId, Long userId, String clientId, String exercise,
                                         String eventJson, int coins, OffsetDateTime solvedAt) {
        dsl.insertInto(LER)
                .set(LER.FAMILY_ID, familyId)
                .set(LER.USER_ID, userId)
                .set(LER.CLIENT_ID, clientId)
                .set(LER.EXERCISE, exercise)
                .set(LER.EVENT, JSONB.jsonb(eventJson))
                .set(LER.COINS, coins)
                .set(LER.SOLVED_AT, solvedAt)
                .set(LER.CREATED_AT, OffsetDateTime.now())
                .onConflictDoNothing()
                .execute();
    }

    /** Count and coins per user, local day (in {@code zone}) and exercise, for results solved since {@code from}. */
    public Result<Record5<Long, LocalDate, String, Integer, Integer>> dailyTotals(Long familyId, OffsetDateTime from, String zone) {
        // Inlined (zone is a validated ZoneId): with a bind value per use, Postgres sees SELECT and GROUP BY as different
        var day = DSL.field("({0} AT TIME ZONE {1})::date", SQLDataType.LOCALDATE, LER.SOLVED_AT, DSL.inline(zone));
        return dsl.select(
                        LER.USER_ID,
                        day,
                        LER.EXERCISE,
                        DSL.count().as("count"),
                        DSL.sum(LER.COINS).cast(SQLDataType.INTEGER).as("coins"))
                .from(LER)
                .where(LER.FAMILY_ID.eq(familyId).and(LER.SOLVED_AT.ge(from)))
                .groupBy(LER.USER_ID, day, LER.EXERCISE)
                .orderBy(day.desc(), LER.EXERCISE)
                .fetch();
    }

    public void deleteForUser(Long familyId, Long userId) {
        dsl.deleteFrom(LER)
                .where(LER.FAMILY_ID.eq(familyId).and(LER.USER_ID.eq(userId)))
                .execute();
    }
}
