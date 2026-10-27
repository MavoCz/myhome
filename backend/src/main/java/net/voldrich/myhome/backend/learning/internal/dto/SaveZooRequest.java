package net.voldrich.myhome.backend.learning.internal.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.Map;

/**
 * Replaces the child's zoo document. {@code version} is the version the app last loaded (0 for a new zoo);
 * {@code claimedGrantIds} are bonus-coin grants whose coins this state already includes.
 */
public record SaveZooRequest(
        @NotNull @Min(0) Long version,
        @NotNull Map<String, Object> state,
        List<Long> claimedGrantIds
) {}
