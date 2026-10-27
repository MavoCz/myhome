package net.voldrich.myhome.backend.learning.internal.dto;

import java.time.LocalDate;

public record DailyProgressResponse(
        LocalDate date,
        String exercise,
        int count,
        int coins
) {}
