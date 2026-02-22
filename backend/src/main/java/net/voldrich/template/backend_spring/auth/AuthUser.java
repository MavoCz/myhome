package net.voldrich.template.backend_spring.auth;

public record AuthUser(
        Long id,
        String email,
        String displayName,
        Long familyId,
        FamilyRole familyRole
) {}
