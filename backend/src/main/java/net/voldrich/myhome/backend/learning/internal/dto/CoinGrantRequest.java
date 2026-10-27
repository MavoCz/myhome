package net.voldrich.myhome.backend.learning.internal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CoinGrantRequest(
        @NotNull Long userId,
        @NotNull @Min(1) @Max(1000) Integer amount,
        @Size(max = 255) String note
) {}
