package net.voldrich.myhome.backend.expenses.internal.controller;

import net.voldrich.myhome.backend.auth.RequiresModuleAccess;
import net.voldrich.myhome.backend.expenses.internal.dto.ExchangeRateResponse;
import net.voldrich.myhome.backend.expenses.internal.service.ExchangeRateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/expenses/rates")
@RequiresModuleAccess("expenses")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    public ExchangeRateController(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
    }

    @GetMapping
    public ResponseEntity<List<ExchangeRateResponse>> getRates() {
        return ResponseEntity.ok(exchangeRateService.getAllRates());
    }
}
