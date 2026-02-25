package net.voldrich.myhome.backend.auth;

public record AuthUser(
        Long id,
        String email,
        String displayName,
        Long familyId,
        FamilyRole familyRole
) {}
