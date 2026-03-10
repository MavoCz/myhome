package net.voldrich.myhome.backend.expenses.internal.controller;

import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.auth.RequiresModuleAccess;
import net.voldrich.myhome.backend.expenses.internal.dto.BalanceResponse;
import net.voldrich.myhome.backend.expenses.internal.dto.MonthlySummaryResponse;
import net.voldrich.myhome.backend.expenses.internal.service.BalanceService;
import net.voldrich.myhome.backend.expenses.internal.service.SummaryService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiresModuleAccess("expenses")
public class ExpenseSummaryController {

    private final BalanceService balanceService;
    private final SummaryService summaryService;
    private final AuthModuleApi authModuleApi;

    public ExpenseSummaryController(BalanceService balanceService, SummaryService summaryService,
                                    AuthModuleApi authModuleApi) {
        this.balanceService = balanceService;
        this.summaryService = summaryService;
        this.authModuleApi = authModuleApi;
    }

    private AuthUser requireCurrentUser() {
        return authModuleApi.getCurrentUser()
                .orElseThrow(() -> new IllegalStateException("No authenticated user"));
    }

    @GetMapping("/balances")
    public ResponseEntity<List<BalanceResponse>> getBalances() {
        var user = requireCurrentUser();
        return ResponseEntity.ok(balanceService.getBalances(user.familyId()));
    }

    @GetMapping("/summary")
    public ResponseEntity<MonthlySummaryResponse> getMonthlySummary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month) {
        var user = requireCurrentUser();
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();
        return ResponseEntity.ok(summaryService.getMonthlySummary(user.familyId(), y, m));
    }
}
