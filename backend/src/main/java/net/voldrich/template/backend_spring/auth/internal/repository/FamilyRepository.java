package net.voldrich.template.backend_spring.auth.internal.repository;

import net.voldrich.template.backend_spring.jooq.tables.Families;
import net.voldrich.template.backend_spring.jooq.tables.records.FamiliesRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class FamilyRepository {

    private static final Families FAMILIES = Families.FAMILIES;
    private final DSLContext dsl;

    public FamilyRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public FamiliesRecord create(String name) {
        return dsl.insertInto(FAMILIES)
                .set(FAMILIES.NAME, name)
                .returning()
                .fetchOne();
    }

    public Optional<FamiliesRecord> findById(Long id) {
        return dsl.selectFrom(FAMILIES)
                .where(FAMILIES.ID.eq(id))
                .fetchOptional();
    }
}
