package net.voldrich.myhome.backend.expenses.internal.service;

import net.voldrich.myhome.backend.expenses.ExpenseCurrency;
import net.voldrich.myhome.backend.expenses.internal.dto.ExchangeRateResponse;
import net.voldrich.myhome.backend.expenses.internal.repository.ExchangeRateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.MathContext;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
public class ExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateService.class);
    private static final String FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=CZK";

    private final ExchangeRateRepository exchangeRateRepository;
    private final RestClient restClient;

    public ExchangeRateService(ExchangeRateRepository exchangeRateRepository) {
        this.exchangeRateRepository = exchangeRateRepository;
        this.restClient = RestClient.create();
    }

    @Scheduled(cron = "0 0 17 * * *", zone = "Europe/Prague")
    @Transactional
    public void refreshRates() {
        log.info("Refreshing exchange rates from Frankfurter API");
        try {
            fetchAndStoreRates();
            log.info("Exchange rates refreshed successfully");
        } catch (Exception e) {
            log.warn("Failed to refresh exchange rates: {}", e.getMessage());
        }
    }

    @Transactional
    public void initializeIfNeeded() {
        var rates = exchangeRateRepository.findAll();
        if (rates.isEmpty()) {
            log.info("No exchange rates found, fetching initial rates");
            fetchAndStoreRates();
        }
    }

    @SuppressWarnings("unchecked")
    private void fetchAndStoreRates() {
        var response = restClient.get()
                .uri(FRANKFURTER_URL)
                .retrieve()
                .body(Map.class);

        if (response == null || !response.containsKey("rates")) {
            throw new IllegalStateException("Invalid response from Frankfurter API");
        }

        var rates = (Map<String, Number>) response.get("rates");
        var fetchedAt = OffsetDateTime.now();

        for (var entry : rates.entrySet()) {
            String code = entry.getKey();
            // Frankfurter returns how much foreign currency 1 CZK buys.
            // We need rateToCzk = how much CZK 1 unit of foreign currency costs.
            BigDecimal rateFromCzk = BigDecimal.valueOf(entry.getValue().doubleValue());
            if (rateFromCzk.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal rateToCzk = BigDecimal.ONE.divide(rateFromCzk, MathContext.DECIMAL64);
                exchangeRateRepository.upsert(code, rateToCzk, fetchedAt);
            }
        }
    }

    public BigDecimal convertToCzk(BigDecimal amount, ExpenseCurrency currency) {
        if (currency == ExpenseCurrency.CZK) {
            return amount;
        }
        var rate = exchangeRateRepository.findByCurrencyCode(currency.name())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                        "Exchange rate not available for " + currency));
        return amount.multiply(rate.getRateToCzk(), MathContext.DECIMAL64)
                .setScale(2, java.math.RoundingMode.HALF_UP);
    }

    public BigDecimal getRate(ExpenseCurrency currency) {
        if (currency == ExpenseCurrency.CZK) {
            return BigDecimal.ONE;
        }
        return exchangeRateRepository.findByCurrencyCode(currency.name())
                .map(r -> r.getRateToCzk())
                .orElse(null);
    }

    public OffsetDateTime getRateFetchedAt(ExpenseCurrency currency) {
        if (currency == ExpenseCurrency.CZK) {
            return null;
        }
        return exchangeRateRepository.findByCurrencyCode(currency.name())
                .map(r -> r.getFetchedAt())
                .orElse(null);
    }

    public List<ExchangeRateResponse> getAllRates() {
        return exchangeRateRepository.findAll().stream()
                .map(r -> new ExchangeRateResponse(r.getCurrencyCode(), r.getRateToCzk(), r.getFetchedAt()))
                .toList();
    }
}
