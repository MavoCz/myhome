package net.voldrich.myhome.backend.auth;

public record FamilyMemberAddedEvent(
        Long familyId,
        Long userId,
        String displayName,
        FamilyRole role
) {}
