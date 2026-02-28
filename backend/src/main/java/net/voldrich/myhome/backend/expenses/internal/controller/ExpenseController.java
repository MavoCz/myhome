package net.voldrich.myhome.backend.expenses.internal.controller;

import jakarta.validation.Valid;
import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.auth.RequiresModuleAccess;
import net.voldrich.myhome.backend.expenses.internal.dto.EditHistoryResponse;
import net.voldrich.myhome.backend.expenses.internal.dto.ExpenseRequest;
import net.voldrich.myhome.backend.expenses.internal.dto.ExpenseResponse;
import net.voldrich.myhome.backend.expenses.internal.service.ExpenseService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@RequiresModuleAccess("expenses")
public class ExpenseController {

    private final ExpenseService expenseService;
    private final AuthModuleApi authModuleApi;

    public ExpenseController(ExpenseService expenseService, AuthModuleApi authModuleApi) {
        this.expenseService = expenseService;
        this.authModuleApi = authModuleApi;
    }

    private AuthUser requireCurrentUser() {
        return authModuleApi.getCurrentUser()
                .orElseThrow(() -> new IllegalStateException("No authenticated user"));
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> listExpenses(
            @RequestParam(required = false) Long groupId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        var user = requireCurrentUser();
        var result = expenseService.listExpenses(user, groupId, year, month, page, size);
        return ResponseEntity.ok(Map.of(
                "content", result.content(),
                "totalElements", result.totalElements(),
                "page", result.page(),
                "size", result.size()
        ));
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> createExpense(@Valid @RequestBody ExpenseRequest request) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(expenseService.createExpense(user, request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseResponse> updateExpense(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseRequest request) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(expenseService.updateExpense(user, id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long id) {
        var user = requireCurrentUser();
        expenseService.deleteExpense(user, id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ExpenseResponse> restoreExpense(@PathVariable Long id) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(expenseService.restoreExpense(user, id));
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<EditHistoryResponse>> getHistory(@PathVariable Long id) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(expenseService.getHistory(user.familyId(), id));
    }
}
