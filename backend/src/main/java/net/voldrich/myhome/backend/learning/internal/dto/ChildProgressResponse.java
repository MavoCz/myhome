package net.voldrich.myhome.backend.learning.internal.dto;

import java.util.List;

/** coins and earned come from the child's zoo document; null until the child first opens the zoo. */
public record ChildProgressResponse(
        Long userId,
        String displayName,
        Integer coins,
        Integer earned,
        List<DailyProgressResponse> days
) {}
