package net.voldrich.template.backend_spring.auth.internal.dto;

import net.voldrich.template.backend_spring.auth.FamilyRole;

public record FamilyMemberResponse(
        Long userId,
        String email,
        String displayName,
        FamilyRole role
) {}
