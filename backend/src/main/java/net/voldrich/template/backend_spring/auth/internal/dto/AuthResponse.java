package net.voldrich.template.backend_spring.auth.internal.dto;

import net.voldrich.template.backend_spring.auth.AuthUser;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        AuthUser user
) {}
