# Notification Module — Product Requirements Document

## 1. Overview

The notification module delivers real-time, user-visible notifications when important events happen in the application. It listens to domain events from other modules (starting with the auth module's family events), persists notifications in the database, and pushes them to connected clients via Server-Sent Events (SSE).

## 2. Goals

- Centralized notification system that other modules can leverage via domain events
- Real-time delivery via SSE with automatic reconnection
- Persistent notification history with read/unread tracking
- Clean module boundaries — notification module only depends on public APIs of event-publishing modules

## 3. Architecture

### Event Flow

```
Publishing Module          Notification Module              Frontend
─────────────────          ───────────────────              ────────
Service method             NotificationEventListener        useNotificationSSE
  │ publishEvent()           │ @ApplicationModuleListener     │ fetch-event-source
  ▼                          ▼                               ▼
ApplicationEventPublisher  NotificationService             NotificationBell
                             │ persist + push via SSE        │ Zustand store
                             ▼                               │ popover list
                           SseEmitterService                │ unread badge
                             │ per-user emitters
                             │ heartbeats every 30s
```

### Spring Modulith Integration

Events are published using Spring's `ApplicationEventPublisher` and persisted via `spring-modulith-starter-jdbc` (EVENT_PUBLICATION table). The notification module listens using `@ApplicationModuleListener`, which provides at-least-once delivery guarantees.

## 4. Notification Types

| Type | Trigger | Title | Message |
|------|---------|-------|---------|
| `FAMILY_MEMBER_ADDED` | New member added to family | "New family member" | "{name} has joined the family as {role}" |
| `FAMILY_MEMBER_REMOVED` | Member removed from family | "Family member removed" | "{name} has been removed from the family" |
| `ROLE_CHANGED` | Member's role changed | "Role changed" | "{name}'s role has been changed to {role}" |

### Recipient Rules

- **FAMILY_MEMBER_ADDED**: All existing family members except the newly added member
- **FAMILY_MEMBER_REMOVED**: All remaining family members (the removed member is excluded since they're no longer in the family)
- **ROLE_CHANGED**: All family members including the affected member

## 5. REST API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/notifications` | Authenticated | Get last 50 notifications for current user |
| POST | `/api/notifications/{id}/read` | Authenticated | Mark a notification as read |
| POST | `/api/notifications/read-all` | Authenticated | Mark all notifications as read |
| GET | `/api/notifications/stream` | Authenticated | SSE stream for real-time notifications |

### GET /api/notifications

**Response:**
```json
[
  {
    "id": 1,
    "type": "FAMILY_MEMBER_ADDED",
    "title": "New family member",
    "message": "Bob has joined the family as child",
    "data": null,
    "read": false,
    "createdAt": "2026-02-24T10:30:00Z"
  }
]
```

Returns the most recent 50 notifications ordered by creation time descending.

### POST /api/notifications/{id}/read

Returns `200 OK` with empty body. Returns error if notification not found or doesn't belong to the current user.

### POST /api/notifications/read-all

Returns `200 OK` with empty body. Marks all unread notifications for the current user as read.

## 6. SSE Protocol

### Endpoint

`GET /api/notifications/stream` with `Accept: text/event-stream` and `Authorization: Bearer <token>`.

### Event Types

| Event Name | Payload | Description |
|------------|---------|-------------|
| `connected` | `"ok"` | Sent immediately on connection |
| `heartbeat` | `""` | Sent every 30 seconds to keep connection alive |
| `notification` | JSON | New notification payload |

### Notification Event Payload

```json
{
  "id": 1,
  "type": "FAMILY_MEMBER_ADDED",
  "title": "New family member",
  "message": "Bob has joined the family as child",
  "data": null,
  "createdAt": "2026-02-24T10:30:00Z"
}
```

### Connection Behavior

- Emitter timeout: 5 minutes (clients should reconnect)
- Heartbeat interval: 30 seconds
- Authentication: JWT token in Authorization header
- Multiple connections per user are supported

## 7. Database Schema

```
notifications
├── id (PK, identity)
├── user_id → users(id) ON DELETE CASCADE
├── family_id → families(id) ON DELETE CASCADE
├── type (VARCHAR 50)
├── title (VARCHAR 255)
├── message (TEXT, nullable)
├── data (JSONB, nullable)
├── read (BOOLEAN, default FALSE)
└── created_at (TIMESTAMPTZ, default now())

Indexes:
├── idx_notifications_user_id (user_id)
└── idx_notifications_user_unread (user_id, read) WHERE read = FALSE
```

## 8. Frontend Integration

### Components

- **NotificationBell** — MUI IconButton with Badge showing unread count, Popover dropdown with notification list
- **useNotificationSSE** — React hook that establishes SSE connection when authenticated, handles reconnection and token refresh
- **notificationStore** — Zustand store (no persistence) holding notifications array and unread count

### SSE Connection Lifecycle

1. `AppShell` mounts → `useNotificationSSE` hook fires
2. Fetches existing notifications via REST API
3. Opens SSE connection with current JWT token
4. On `notification` event → adds to store, updates unread count
5. On 401 → attempts token refresh, reconnects
6. On tab hidden → disconnects; on tab visible → reconnects
7. On logout → aborts connection

## 9. Module Structure (Spring Modulith)

```
notification/
  NotificationType.java        # Public enum
  NotificationModuleApi.java   # Public interface
  internal/
    config/
      NotificationConfig.java  # Scheduling config
    controller/
      NotificationController.java
    dto/
      NotificationResponse.java
      SseNotificationPayload.java
    repository/
      NotificationRepository.java
    service/
      NotificationService.java
      NotificationEventListener.java
      SseEmitterService.java
```

## 10. Public API for Other Modules

```java
public interface NotificationModuleApi {
    long getUnreadCount(Long userId);
}
```

## 11. Configuration

```properties
# Enables automatic creation of EVENT_PUBLICATION table for Spring Modulith event persistence
spring.modulith.events.jdbc.schema-initialization.enabled=true
```
