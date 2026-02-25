package net.voldrich.myhome.backend.auth;

public record FamilyMemberRoleChangedEvent(
        Long familyId,
        Long userId,
        String displayName,
        FamilyRole newRole
) {}
