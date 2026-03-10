package net.voldrich.myhome.backend.expenses.internal.dto;

import java.util.List;

public record ImportResultResponse(int imported, int skipped, int failed, List<String> errors) {}
