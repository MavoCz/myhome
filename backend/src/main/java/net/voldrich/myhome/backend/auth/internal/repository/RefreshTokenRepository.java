package net.voldrich.myhome.backend.auth.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.RefreshTokens;
import net.voldrich.myhome.backend.jooq.tables.records.RefreshTokensRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public class RefreshTokenRepository {

    private static final RefreshTokens RT = RefreshTokens.REFRESH_TOKENS;
    private final DSLContext dsl;

    public RefreshTokenRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public void create(Long userId, String tokenHash, String deviceInfo, OffsetDateTime expiresAt) {
        dsl.insertInto(RT)
                .set(RT.USER_ID, userId)
                .set(RT.TOKEN_HASH, tokenHash)
                .set(RT.DEVICE_INFO, deviceInfo)
                .set(RT.EXPIRES_AT, expiresAt)
                .execute();
    }

    public Optional<RefreshTokensRecord> findByTokenHash(String tokenHash) {
        return dsl.selectFrom(RT)
                .where(RT.TOKEN_HASH.eq(tokenHash)
                        .and(RT.REVOKED.eq(false))
                        .and(RT.EXPIRES_AT.gt(OffsetDateTime.now())))
                .fetchOptional();
    }

    public void revokeByTokenHash(String tokenHash) {
        dsl.update(RT)
                .set(RT.REVOKED, true)
                .where(RT.TOKEN_HASH.eq(tokenHash))
                .execute();
    }

    public void revokeAllByUserId(Long userId) {
        dsl.update(RT)
                .set(RT.REVOKED, true)
                .where(RT.USER_ID.eq(userId).and(RT.REVOKED.eq(false)))
                .execute();
    }
}
