package net.voldrich.myhome.backend.auth;

public record FamilyMemberRemovedEvent(
        Long familyId,
        Long userId,
        String displayName
) {}
