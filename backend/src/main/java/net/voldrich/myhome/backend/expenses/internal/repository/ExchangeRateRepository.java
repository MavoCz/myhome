package net.voldrich.myhome.backend.expenses.internal.repository;

import net.voldrich.myhome.backend.jooq.tables.ExchangeRates;
import net.voldrich.myhome.backend.jooq.tables.records.ExchangeRatesRecord;
import org.jooq.DSLContext;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public class ExchangeRateRepository {

    private static final ExchangeRates ER = ExchangeRates.EXCHANGE_RATES;
    private final DSLContext dsl;

    public ExchangeRateRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ExchangeRatesRecord> findAll() {
        return dsl.selectFrom(ER).fetch();
    }

    public Optional<ExchangeRatesRecord> findByCurrencyCode(String currencyCode) {
        return dsl.selectFrom(ER)
                .where(ER.CURRENCY_CODE.eq(currencyCode))
                .fetchOptional();
    }

    public void upsert(String currencyCode, BigDecimal rateToCzk, OffsetDateTime fetchedAt) {
        dsl.insertInto(ER)
                .set(ER.CURRENCY_CODE, currencyCode)
                .set(ER.RATE_TO_CZK, rateToCzk)
                .set(ER.FETCHED_AT, fetchedAt)
                .onConflict(ER.CURRENCY_CODE)
                .doUpdate()
                .set(ER.RATE_TO_CZK, rateToCzk)
                .set(ER.FETCHED_AT, fetchedAt)
                .execute();
    }
}
