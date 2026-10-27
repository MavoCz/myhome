package net.voldrich.myhome.backend.learning.internal.dto;

import java.util.Map;

public record ZooResponse(
        Long userId,
        String displayName,
        Map<String, Object> state,
        long version
) {}
