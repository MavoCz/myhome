package net.voldrich.myhome.backend.learning.internal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ExerciseResultsRequest(
        @NotEmpty @Size(max = 500) List<@Valid ExerciseResultRequest> results
) {}
