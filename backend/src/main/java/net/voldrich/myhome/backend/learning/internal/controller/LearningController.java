package net.voldrich.myhome.backend.learning.internal.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.AuthUser;
import net.voldrich.myhome.backend.auth.RequiresModuleAccess;
import net.voldrich.myhome.backend.learning.internal.dto.*;
import net.voldrich.myhome.backend.learning.internal.service.LearningService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Školní zoo: children's zoo documents and exercise results, parents' progress view and bonus coins. */
@RestController
@RequestMapping("/api/learning")
@RequiresModuleAccess("learning")
public class LearningController {

    private final LearningService learningService;
    private final AuthModuleApi authModuleApi;

    public LearningController(LearningService learningService, AuthModuleApi authModuleApi) {
        this.learningService = learningService;
        this.authModuleApi = authModuleApi;
    }

    private AuthUser requireCurrentUser() {
        return authModuleApi.getCurrentUser()
                .orElseThrow(() -> new IllegalStateException("No authenticated user"));
    }

    @GetMapping("/zoo")
    public ResponseEntity<MyZooResponse> getMyZoo() {
        return ResponseEntity.ok(learningService.getMyZoo(requireCurrentUser()));
    }

    @PutMapping("/zoo")
    public ResponseEntity<SaveZooResponse> saveMyZoo(@Valid @RequestBody SaveZooRequest request) {
        return ResponseEntity.ok(learningService.saveMyZoo(requireCurrentUser(), request));
    }

    @GetMapping("/zoos")
    public ResponseEntity<List<ZooResponse>> listFamilyZoos() {
        return ResponseEntity.ok(learningService.listFamilyZoos(requireCurrentUser()));
    }

    @PostMapping("/results")
    public ResponseEntity<Void> recordResults(@Valid @RequestBody ExerciseResultsRequest request) {
        learningService.recordResults(requireCurrentUser(), request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/progress")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARENT')")
    public ResponseEntity<List<ChildProgressResponse>> progress(
            @RequestParam(defaultValue = "14") @Min(1) @Max(90) int days,
            @RequestParam(defaultValue = "UTC") String timezone) {
        return ResponseEntity.ok(learningService.progress(requireCurrentUser(), days, timezone));
    }

    @GetMapping("/grants")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARENT')")
    public ResponseEntity<List<CoinGrantResponse>> recentGrants() {
        return ResponseEntity.ok(learningService.recentGrants(requireCurrentUser()));
    }

    @PostMapping("/grants")
    @PreAuthorize("hasAnyRole('ADMIN', 'PARENT')")
    public ResponseEntity<CoinGrantResponse> grantCoins(@Valid @RequestBody CoinGrantRequest request) {
        return ResponseEntity.ok(learningService.grantCoins(requireCurrentUser(), request));
    }
}
