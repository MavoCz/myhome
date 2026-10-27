package net.voldrich.myhome.backend.learning.internal.dto;

import java.util.List;
import java.util.Map;

/** The signed-in child's own zoo; state is null and version 0 until the first save. */
public record MyZooResponse(
        Long userId,
        String displayName,
        Map<String, Object> state,
        long version,
        List<CoinGrantResponse> pendingGrants
) {}
