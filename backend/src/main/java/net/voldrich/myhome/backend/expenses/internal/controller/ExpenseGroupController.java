package net.voldrich.myhome.backend.expenses.internal.controller;

import jakarta.validation.Valid;
import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.auth.ModulePermission;
import net.voldrich.myhome.backend.auth.RequiresModuleAccess;
import net.voldrich.myhome.backend.expenses.internal.dto.*;
import net.voldrich.myhome.backend.expenses.internal.service.ExpenseGroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses/groups")
@RequiresModuleAccess("expenses")
public class ExpenseGroupController {

    private final ExpenseGroupService groupService;
    private final AuthModuleApi authModuleApi;

    public ExpenseGroupController(ExpenseGroupService groupService, AuthModuleApi authModuleApi) {
        this.groupService = groupService;
        this.authModuleApi = authModuleApi;
    }

    private AuthUser requireCurrentUser() {
        return authModuleApi.getCurrentUser()
                .orElseThrow(() -> new IllegalStateException("No authenticated user"));
    }

    @GetMapping
    public ResponseEntity<List<ExpenseGroupResponse>> listGroups() {
        var user = requireCurrentUser();
        return ResponseEntity.ok(groupService.listGroups(user));
    }

    @PostMapping
    @RequiresModuleAccess(value = "expenses", permission = ModulePermission.MANAGE)
    public ResponseEntity<ExpenseGroupResponse> createGroup(@Valid @RequestBody ExpenseGroupRequest request) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(groupService.createGroup(user.familyId(), request));
    }

    @PutMapping("/{id}")
    @RequiresModuleAccess(value = "expenses", permission = ModulePermission.MANAGE)
    public ResponseEntity<ExpenseGroupResponse> updateGroup(
            @PathVariable Long id,
            @Valid @RequestBody ExpenseGroupRequest request) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(groupService.updateGroup(user.familyId(), id, request));
    }

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> archiveGroup(@PathVariable Long id) {
        var user = requireCurrentUser();
        groupService.archiveGroup(user.familyId(), id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        var user = requireCurrentUser();
        groupService.deleteGroup(user.familyId(), id);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/splits")
    @RequiresModuleAccess(value = "expenses", permission = ModulePermission.MANAGE)
    public ResponseEntity<SplitConfigResponse> setSplits(
            @PathVariable Long id,
            @Valid @RequestBody SplitConfigRequest request) {
        var user = requireCurrentUser();
        return ResponseEntity.ok(groupService.setSplits(user.familyId(), id, request));
    }
}
