package net.voldrich.myhome.backend.expenses.internal.service;

import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.expenses.ExpenseCurrency;
import net.voldrich.myhome.backend.expenses.internal.dto.ImportResultResponse;
import net.voldrich.myhome.backend.expenses.internal.repository.ExpenseRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.StringReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
public class ExpenseImportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private final ExpenseRepository expenseRepository;
    private final ExchangeRateService exchangeRateService;

    public ExpenseImportService(ExpenseRepository expenseRepository, ExchangeRateService exchangeRateService) {
        this.expenseRepository = expenseRepository;
        this.exchangeRateService = exchangeRateService;
    }

    public ImportResultResponse importCsv(MultipartFile file, String source, AuthUser user) {
        int imported = 0;
        int skipped = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        var csvFormat = CSVFormat.DEFAULT.builder()
                .setDelimiter(';')
                .setHeader()
                .setSkipHeaderRecord(true)
                .setQuote('"')
                .setTrim(true)
                .get();

        try {
            var content = new String(file.getBytes(), StandardCharsets.UTF_8);
            if (content.startsWith("\uFEFF")) {
                content = content.substring(1);
            }
            try (var reader = new StringReader(content);
                 var parser = csvFormat.parse(reader)) {

                for (CSVRecord record : parser) {
                    long rowNum = record.getRecordNumber();
                    try {
                        String txId = record.get("Id transakce");
                        if (txId != null && !txId.isBlank() &&
                                expenseRepository.existsByExternalTransactionId(user.id(), txId)) {
                            skipped++;
                            continue;
                        }

                        String rawAmount = record.get("Zaúčtovaná částka").replace(",", ".");
                        BigDecimal amount = new BigDecimal(rawAmount);
                        if (amount.compareTo(BigDecimal.ZERO) >= 0) {
                            skipped++; // Skip incoming transfers
                            continue;
                        }
                        amount = amount.abs();

                        LocalDate date = LocalDate.parse(record.get("Datum provedení"), DATE_FMT);

                        String currencyStr = record.get("Měna účtu");
                        ExpenseCurrency currency;
                        try {
                            currency = ExpenseCurrency.valueOf(currencyStr);
                        } catch (IllegalArgumentException e) {
                            currency = ExpenseCurrency.CZK;
                        }

                        String description = resolveDescription(record);

                        BigDecimal czkAmount = exchangeRateService.convertToCzk(amount, currency);
                        BigDecimal exchangeRate = currency == ExpenseCurrency.CZK ? null : exchangeRateService.getRate(currency);
                        OffsetDateTime rateFetchedAt = currency == ExpenseCurrency.CZK ? null : exchangeRateService.getRateFetchedAt(currency);

                        expenseRepository.create(
                                user.familyId(), null, description,
                                amount, currency.name(),
                                czkAmount, exchangeRate, rateFetchedAt, date,
                                user.id(), user.id(),
                                source, txId != null && !txId.isBlank() ? txId : null
                        );
                        imported++;
                    } catch (Exception e) {
                        failed++;
                        errors.add("Row " + rowNum + ": " + e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            errors.add("Failed to parse CSV: " + e.getMessage());
            failed++;
        }

        return new ImportResultResponse(imported, skipped, failed, errors);
    }

    private String resolveDescription(CSVRecord record) {
        String merchant = safeGet(record, "Název obchodníka");
        if (merchant != null && !merchant.isBlank()) return merchant;

        String counterparty = safeGet(record, "Název protiúčtu");
        if (counterparty != null && !counterparty.isBlank()) return counterparty;

        String message = safeGet(record, "Zpráva");
        if (message != null && !message.isBlank()) {
            return message.split(",")[0].trim();
        }

        return "Imported expense";
    }

    private String safeGet(CSVRecord record, String header) {
        try {
            return record.get(header);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
