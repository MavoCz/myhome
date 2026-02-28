package net.voldrich.myhome.backend.notification.internal.service;

import net.voldrich.myhome.backend.auth.AuthModuleApi;
import net.voldrich.myhome.backend.auth.FamilyMemberAddedEvent;
import net.voldrich.myhome.backend.auth.FamilyMemberRemovedEvent;
import net.voldrich.myhome.backend.auth.FamilyMemberRoleChangedEvent;
import net.voldrich.myhome.backend.auth.ModulePermission;
import net.voldrich.myhome.backend.expenses.ExpenseAddedEvent;
import net.voldrich.myhome.backend.expenses.ExpenseDeletedEvent;
import net.voldrich.myhome.backend.notification.NotificationType;
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

    @ApplicationModuleListener
    public void on(ExpenseAddedEvent event) {
        var members = authModuleApi.getFamilyMembers(event.familyId());
        for (var member : members) {
            if (member.id().equals(event.createdByUserId())) {
                continue; // Don't notify the creator
            }
            if (!authModuleApi.hasModuleAccess(member.id(), event.familyId(), "expenses", ModulePermission.ACCESS)) {
                continue; // Only notify members with expense access
            }
            String message = event.createdByDisplayName() + " added \"" + event.description()
                    + "\" \u2014 " + event.originalAmount() + " " + event.originalCurrency()
                    + " (" + event.czkAmount() + " CZK)";
            notificationService.createAndPush(
                    member.id(), event.familyId(),
                    NotificationType.EXPENSE_ADDED,
                    "New expense added",
                    message,
                    null
            );
        }
    }

    @ApplicationModuleListener
    public void on(ExpenseDeletedEvent event) {
        var members = authModuleApi.getFamilyMembers(event.familyId());
        for (var member : members) {
            if (member.id().equals(event.deletedByUserId())) {
                continue; // Don't notify the one who deleted
            }
            if (!authModuleApi.hasModuleAccess(member.id(), event.familyId(), "expenses", ModulePermission.ACCESS)) {
                continue; // Only notify members with expense access
            }
            String message = event.deletedByDisplayName() + " removed \"" + event.description()
                    + "\" (" + event.czkAmount() + " CZK)";
            notificationService.createAndPush(
                    member.id(), event.familyId(),
                    NotificationType.EXPENSE_DELETED,
                    "Expense removed",
                    message,
                    null
            );
        }
    }
}
