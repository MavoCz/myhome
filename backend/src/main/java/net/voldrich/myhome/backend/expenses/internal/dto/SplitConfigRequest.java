package net.voldrich.myhome.backend.expenses.internal.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record SplitConfigRequest(
        @NotEmpty @Valid List<SplitEntry> splits
) {}
