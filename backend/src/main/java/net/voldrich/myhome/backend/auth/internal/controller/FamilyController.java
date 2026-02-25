package net.voldrich.myhome.backend.auth.internal.controller;

import jakarta.validation.Valid;
import net.voldrich.myhome.backend.auth.internal.dto.AddFamilyMemberRequest;
import net.voldrich.myhome.backend.auth.internal.dto.FamilyMemberResponse;
import net.voldrich.myhome.backend.auth.internal.dto.UpdateRoleRequest;
import net.voldrich.myhome.backend.auth.internal.security.AuthUserDetails;
import net.voldrich.myhome.backend.auth.internal.service.FamilyService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/family")
public class FamilyController {

    private final FamilyService familyService;

    public FamilyController(FamilyService familyService) {
        this.familyService = familyService;
    }

    @GetMapping("/members")
    public ResponseEntity<List<FamilyMemberResponse>> listMembers(@AuthenticationPrincipal AuthUserDetails currentUser) {
        return ResponseEntity.ok(familyService.listMembers(currentUser.familyId()));
    }

    @PostMapping("/members")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<FamilyMemberResponse> addMember(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @Valid @RequestBody AddFamilyMemberRequest request) {
        return ResponseEntity.ok(familyService.addMember(currentUser, request));
    }

    @DeleteMapping("/members/{userId}")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @PathVariable Long userId) {
        familyService.removeMember(currentUser.familyId(), userId, currentUser.userId());
        return ResponseEntity.ok().build();
    }

    @PutMapping("/members/{userId}/role")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<Void> updateRole(
            @AuthenticationPrincipal AuthUserDetails currentUser,
            @PathVariable Long userId,
            @Valid @RequestBody UpdateRoleRequest request) {
        familyService.updateRole(currentUser.familyId(), userId, request.role(), currentUser.userId());
        return ResponseEntity.ok().build();
    }
}
