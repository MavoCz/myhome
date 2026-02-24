package net.voldrich.template.backend_spring.notification;

public interface NotificationModuleApi {

    long getUnreadCount(Long userId);
}
