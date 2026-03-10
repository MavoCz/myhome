package net.voldrich.myhome.backend.expenses.internal.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

@Component
public class ExpenseModuleStartup implements ApplicationListener<ApplicationReadyEvent> {

    private final ExchangeRateService exchangeRateService;

    public ExpenseModuleStartup(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    @Override
    public void onApplicationEvent(ApplicationReadyEvent event) {
        // Run async so startup is not blocked if exchange rate API is unavailable
        Thread.ofVirtual().start(() -> {
            try {
                exchangeRateService.initializeIfNeeded();
            } catch (Exception e) {
                // Log only — the app should start normally without rates
            }
        });
    }
}
