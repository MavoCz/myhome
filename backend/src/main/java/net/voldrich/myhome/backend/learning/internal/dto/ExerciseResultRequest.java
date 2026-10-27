package net.voldrich.myhome.backend.learning.internal.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.Map;

public record ExerciseResultRequest(
        @NotBlank @Size(max = 64) String clientId,
        @NotBlank @Size(max = 50) String exercise,
        @NotNull Map<String, Object> event,
        @NotNull @Min(0) @Max(1000) Integer coins,
        @NotNull OffsetDateTime solvedAt
) {}
