package net.voldrich.template.backend_spring.auth;

public record FamilyMemberAddedEvent(
        Long familyId,
        Long userId,
        String displayName,
        FamilyRole role
) {}
