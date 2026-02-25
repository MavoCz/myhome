package net.voldrich.myhome.backend.auth.internal.dto;

import net.voldrich.myhome.backend.auth.AuthUser;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        AuthUser user
) {}
