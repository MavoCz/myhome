package net.voldrich.template.backend_spring.auth;

public record FamilyMemberRoleChangedEvent(
        Long familyId,
        Long userId,
        String displayName,
        FamilyRole newRole
) {}
