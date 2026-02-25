package net.voldrich.myhome.backend.auth.internal.dto;

import net.voldrich.myhome.backend.auth.FamilyRole;

public record FamilyMemberResponse(
        Long userId,
        String email,
        String displayName,
        FamilyRole role
) {}
