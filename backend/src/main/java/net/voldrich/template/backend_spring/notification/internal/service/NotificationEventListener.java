package net.voldrich.template.backend_spring.notification.internal.service;

import net.voldrich.template.backend_spring.auth.AuthModuleApi;
import net.voldrich.template.backend_spring.auth.FamilyMemberAddedEvent;
import net.voldrich.template.backend_spring.auth.FamilyMemberRemovedEvent;
import net.voldrich.template.backend_spring.auth.FamilyMemberRoleChangedEvent;
import net.voldrich.template.backend_spring.notification.NotificationType;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Service;

@Service
public class NotificationEventListener {

    private final NotificationService notificationService;
    private final AuthModuleApi authModuleApi;

    public NotificationEventListener(NotificationService notificationService, AuthModuleApi authModuleApi) {
        this.notificationService = notificationService;
        this.authModuleApi = authModuleApi;
    }

    @ApplicationModuleListener
    public void on(FamilyMemberAddedEvent event) {
        var members = authModuleApi.getFamilyMembers(event.familyId());
        for (var member : members) {
            if (member.id().equals(event.userId())) {
                continue; // Don't notify the newly added member about themselves
            }
            notificationService.createAndPush(
                    member.id(),
                    event.familyId(),
                    NotificationType.FAMILY_MEMBER_ADDED,
                    "New family member",
                    event.displayName() + " has joined the family as " + event.role().name().toLowerCase(),
                    null
            );
        }
    }

    @ApplicationModuleListener
    public void on(FamilyMemberRemovedEvent event) {
        var members = authModuleApi.getFamilyMembers(event.familyId());
        for (var member : members) {
            notificationService.createAndPush(
                    member.id(),
                    event.familyId(),
                    NotificationType.FAMILY_MEMBER_REMOVED,
                    "Family member removed",
                    event.displayName() + " has been removed from the family",
                    null
            );
        }
    }

    @ApplicationModuleListener
    public void on(FamilyMemberRoleChangedEvent event) {
        var members = authModuleApi.getFamilyMembers(event.familyId());
        for (var member : members) {
            notificationService.createAndPush(
                    member.id(),
                    event.familyId(),
                    NotificationType.ROLE_CHANGED,
                    "Role changed",
                    event.displayName() + "'s role has been changed to " + event.newRole().name().toLowerCase(),
                    null
            );
        }
    }
}
