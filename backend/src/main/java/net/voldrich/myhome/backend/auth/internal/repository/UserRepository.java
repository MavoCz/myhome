package net.voldrich.myhome.backend.auth.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.Users;
import net.voldrich.myhome.backend.jooq.tables.records.UsersRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class UserRepository {

    private static final Users USERS = Users.USERS;
    private final DSLContext dsl;

    public UserRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public Optional<UsersRecord> findByEmail(String email) {
        return dsl.selectFrom(USERS)
                .where(USERS.EMAIL.eq(email))
                .fetchOptional();
    }

    public Optional<UsersRecord> findById(Long id) {
        return dsl.selectFrom(USERS)
                .where(USERS.ID.eq(id))
                .fetchOptional();
    }

    public UsersRecord create(String email, String passwordHash, String displayName) {
        return dsl.insertInto(USERS)
                .set(USERS.EMAIL, email)
                .set(USERS.PASSWORD_HASH, passwordHash)
                .set(USERS.DISPLAY_NAME, displayName)
                .returning()
                .fetchOne();
    }

    public boolean existsByEmail(String email) {
        return dsl.fetchExists(
                dsl.selectFrom(USERS).where(USERS.EMAIL.eq(email))
        );
    }

    public void deleteById(Long id) {
        dsl.deleteFrom(USERS)
                .where(USERS.ID.eq(id))
                .execute();
    }
}
