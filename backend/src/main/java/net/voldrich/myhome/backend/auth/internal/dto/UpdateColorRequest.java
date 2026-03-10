package net.voldrich.myhome.backend.auth.internal.dto;

import jakarta.validation.constraints.Pattern;

public record UpdateColorRequest(
        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Color must be a hex color like #FF0000")
        String color
) {}
