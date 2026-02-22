package net.voldrich.template.backend_spring.auth.internal.controller;

import jakarta.validation.Valid;
import net.voldrich.template.backend_spring.auth.internal.dto.GrantModuleAccessRequest;
import net.voldrich.template.backend_spring.auth.internal.dto.ModuleAccessResponse;
import net.voldrich.template.backend_spring.auth.internal.dto.UpdateModuleAccessRequest;
import net.voldrich.template.backend_spring.auth.internal.security.AuthUserDetails;
import net.voldrich.template.backend_spring.auth.internal.service.ModuleAccessService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family/module-access")
@PreAuthorize("hasRole('PARENT')")
public class ModuleAccessController {

    private final ModuleAccessService moduleAccessService;

    public ModuleAccessController(ModuleAccessService moduleAccessService) {
        this.moduleAccessService = moduleAccessService;
    }

    @PostMapping
    public ResponseEntity<ModuleAccessResponse> grantAccess(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @Valid @RequestBody GrantModuleAccessRequest request) {
        return ResponseEntity.ok(moduleAccessService.grantAccess(currentUser.familyId(), currentUser.userId(), request));
    }

    @GetMapping
    public ResponseEntity<List<ModuleAccessResponse>> listAccess(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @RequestParam Long userId) {
        return ResponseEntity.ok(moduleAccessService.listAccess(currentUser.familyId(), userId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ModuleAccessResponse> updateAccess(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @PathVariable Long id,
            @Valid @RequestBody UpdateModuleAccessRequest request) {
        return ResponseEntity.ok(moduleAccessService.updateAccess(id, currentUser.familyId(), request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> revokeAccess(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @PathVariable Long id) {
        moduleAccessService.revokeAccess(id, currentUser.familyId());
        return ResponseEntity.ok().build();
    }
}
