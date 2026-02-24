package net.voldrich.template.backend_spring.auth;

public record FamilyMemberRemovedEvent(
        Long familyId,
        Long userId,
        String displayName
) {}
