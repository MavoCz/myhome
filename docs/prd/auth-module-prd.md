# Auth Module — Product Requirements Document

## 1. Overview

The auth module provides authentication and authorization for a family-oriented modular application. Users belong to families with an admin/parent/child hierarchy. Admins control which application modules each family member can access, with optional time-based and recurring schedule restrictions. The module supports both web and mobile clients via stateless JWT authentication.

## 2. Goals

- Secure, stateless authentication using JWT access tokens and opaque refresh tokens
- Family-based user grouping with admin/parent/child roles
- Fine-grained, per-module permission system with temporal and schedule constraints
- Clean public API for other Spring Modulith modules to check access
- Support token rotation for refresh tokens to limit exposure if a token is compromised

## 3. User Roles

| Role | Description |
|------|-------------|
| **ADMIN** | Family administrator. Full automatic access to all modules. Can manage family members (add, remove, change roles), invite existing users by email, and grant/revoke module access. |
| **PARENT** | Standard family member. No automatic module access — requires explicit grants from an admin. |
| **CHILD** | Restricted family member. No automatic module access — requires explicit grants from an admin. Subject to time and schedule restrictions. |

## 4. Core Concepts

### 4.1 Family

A family is the top-level organizational unit. Every user belongs to exactly one family. A family is created automatically when the first user registers, and that user becomes its admin.

### 4.2 Module Access

A module access grant gives a non-admin user permission to use a specific application module. Each grant specifies:

- **Module name** — identifies the target module (e.g., `"tasks"`, `"calendar"`)
- **Permission level** — `ACCESS` (use the module) or `MANAGE` (administer the module). `MANAGE` implies `ACCESS`.
- **Validity window** (optional) — `valid_from` / `valid_until` timestamps. Outside this window the grant is inactive.
- **Schedules** (optional) — recurring weekly time windows (day of week + start/end time + timezone). If schedules are present, at least one must match the current time for the grant to be active.

Admins bypass all module access checks — they always have full access. Parents and children both require explicit grants.

### 4.3 Tokens

| Token | Format | Lifetime | Storage |
|-------|--------|----------|---------|
| Access token | HMAC-SHA256 signed JWT | 15 minutes (configurable) | Client only |
| Refresh token | Opaque UUID | 7 days (configurable) | SHA-256 hash in database |

Access tokens carry all claims needed for authorization (userId, familyId, familyRole) so protected requests require no database lookup. Refresh tokens are rotated on each use — the old token is revoked and a new one is issued.

## 5. Authentication Flows

### 5.1 Registration

1. User submits email, password, display name, family name, and optionally an invitation code (registration secret)
2. If `app.registration.secret` is configured (non-empty), the system validates the provided invitation code matches — returns 403 Forbidden if it doesn't
3. System creates a new family and a new user account
4. User is added to the family as `ADMIN`
5. Access and refresh tokens are returned

**Registration secret:** The `app.registration.secret` config property controls open vs. restricted registration. When empty (default), anyone can register. When set, the client must include a matching `registrationSecret` field in the request body.

### 5.2 Login

1. User submits email and password
2. System authenticates via Spring Security's `AuthenticationManager` (BCrypt cost factor 12)
3. Access and refresh tokens are returned

### 5.3 Token Refresh

1. Client submits the opaque refresh token
2. System hashes it (SHA-256), looks up the matching non-revoked, non-expired record
3. Old refresh token is revoked
4. New access + refresh token pair is returned

### 5.4 Logout

1. Client submits the refresh token
2. System revokes it in the database

## 6. Authorization Model

### 6.1 Access Check Order

For non-admin users, each module access check follows this sequence:

1. **Permission level** — Does the grant's permission satisfy the required level?
2. **Validity window** — Is `now` between `valid_from` and `valid_until` (if set)?
3. **Schedule windows** — If schedules exist, does at least one match the current day/time in its timezone?

If any step fails, the grant is skipped. If no grant passes all checks, access is denied.

### 6.2 Enforcement Mechanisms

Other modules can enforce access in two ways:

```java
// Option 1: Custom annotation (preferred)
@RequiresModuleAccess("tasks")
public void someEndpoint() { ... }

// Option 2: Spring Security expression
@PreAuthorize("hasPermission('tasks', 'ACCESS')")
public void someEndpoint() { ... }
```

### 6.3 Public API for Other Modules

Other Spring Modulith modules depend on `AuthModuleApi` (never on `auth.internal`):

```java
public interface AuthModuleApi {
    Optional<AuthUser> getCurrentUser();
    boolean hasModuleAccess(Long userId, Long familyId, String moduleName, ModulePermission permission);
    Optional<FamilyRole> getFamilyRole(Long userId, Long familyId);
    List<AuthUser> getFamilyMembers(Long familyId);
}
```

## 7. REST API

### 7.1 Authentication

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | Public | Register user and create family |
| POST | `/api/auth/login` | Public | Login and receive tokens |
| POST | `/api/auth/refresh` | Public | Rotate refresh token, receive new tokens |
| POST | `/api/auth/logout` | Public | Revoke a refresh token |

**Request/Response examples:**

**Register** — `POST /api/auth/register`
```json
// Request
{ "email": "parent@example.com", "password": "securepass", "displayName": "Alice", "familyName": "Smith Family", "registrationSecret": "optional-code" }

// Response
{ "accessToken": "eyJ...", "refreshToken": "550e8400-...", "expiresIn": 900, "user": { "id": 1, "email": "parent@example.com", "displayName": "Alice", "familyId": 1, "familyRole": "ADMIN" } }
```

**Login** — `POST /api/auth/login`
```json
// Request
{ "email": "parent@example.com", "password": "securepass" }

// Response — same shape as register
```

### 7.2 Family Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/family/members` | Authenticated | List family members |
| POST | `/api/family/members` | ADMIN | Add a family member (creates their account) |
| POST | `/api/family/members/invite` | ADMIN | Invite an existing user by email to the family |
| DELETE | `/api/family/members/{userId}` | ADMIN | Remove a family member |
| PUT | `/api/family/members/{userId}/role` | ADMIN | Change a member's role |

**Add member** — `POST /api/family/members`
```json
// Request
{ "email": "child@example.com", "password": "childpass1", "displayName": "Bob", "role": "CHILD" }

// Response
{ "userId": 2, "email": "child@example.com", "displayName": "Bob", "role": "CHILD" }
```

**Invite member** — `POST /api/family/members/invite`
```json
// Request
{ "email": "existing-user@example.com", "role": "PARENT" }

// Response
{ "userId": 3, "email": "existing-user@example.com", "displayName": "Charlie", "role": "PARENT" }
```

**Business rules:**
- An admin cannot remove themselves from the family
- An admin cannot change their own role
- A user can only be invited if they exist and do not already belong to a family

### 7.3 Module Access Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/family/module-access` | ADMIN | Grant module access to a user |
| GET | `/api/family/module-access?userId={id}` | ADMIN | List a user's module access grants |
| PUT | `/api/family/module-access/{id}` | ADMIN | Update a grant |
| DELETE | `/api/family/module-access/{id}` | ADMIN | Revoke a grant |

**Grant access** — `POST /api/family/module-access`
```json
// Request
{
  "userId": 2,
  "moduleName": "tasks",
  "permission": "ACCESS",
  "validFrom": "2026-01-01T00:00:00Z",
  "validUntil": "2026-12-31T23:59:59Z",
  "schedules": [
    { "dayOfWeek": 1, "startTime": "08:00", "endTime": "20:00", "timezone": "Europe/Prague" },
    { "dayOfWeek": 2, "startTime": "08:00", "endTime": "20:00", "timezone": "Europe/Prague" }
  ]
}

// Response
{
  "id": 1, "userId": 2, "moduleName": "tasks", "permission": "ACCESS",
  "validFrom": "2026-01-01T00:00:00Z", "validUntil": "2026-12-31T23:59:59Z", "grantedBy": 1,
  "schedules": [
    { "id": 1, "dayOfWeek": 1, "startTime": "08:00", "endTime": "20:00", "timezone": "Europe/Prague" },
    { "id": 2, "dayOfWeek": 2, "startTime": "08:00", "endTime": "20:00", "timezone": "Europe/Prague" }
  ]
}
```

## 8. Database Schema

```
families
├── id (PK, identity)
├── name
├── created_at
└── updated_at

users
├── id (PK, identity)
├── email (unique)
├── password_hash (BCrypt)
├── display_name
├── enabled
├── created_at
└── updated_at

family_members
├── id (PK, identity)
├── family_id → families(id)
├── user_id → users(id)
├── role (ADMIN | PARENT | CHILD)
└── UNIQUE(family_id, user_id)

module_access
├── id (PK, identity)
├── family_id → families(id)
├── user_id → users(id)
├── module_name
├── permission (ACCESS | MANAGE)
├── valid_from (nullable)
├── valid_until (nullable)
├── granted_by → users(id)
├── created_at
├── updated_at
└── UNIQUE(family_id, user_id, module_name, permission)

module_access_schedules
├── id (PK, identity)
├── module_access_id → module_access(id)
├── day_of_week (1–7, Monday–Sunday)
├── start_time
├── end_time
└── timezone (default 'UTC')

refresh_tokens
├── id (PK, identity)
├── user_id → users(id)
├── token_hash (unique, SHA-256)
├── device_info (nullable)
├── expires_at
├── revoked
└── created_at
```

All foreign keys use `ON DELETE CASCADE`.

## 9. Security Properties

| Property | Value |
|----------|-------|
| Password hashing | BCrypt, cost factor 12 |
| Session management | Stateless (no server-side sessions) |
| CSRF | Disabled (stateless API) |
| JWT signing | HMAC-SHA256 |
| Refresh token storage | SHA-256 hash (raw token never stored) |
| Refresh token rotation | Enabled (old token revoked on each refresh) |

## 10. Configuration

```properties
app.jwt.secret=<base64-encoded-256-bit-key>
app.jwt.access-token-expiration-ms=900000       # 15 minutes
app.jwt.refresh-token-expiration-ms=604800000    # 7 days
app.jwt.issuer=backend
```

## 11. Domain Events

The auth module publishes domain events via `ApplicationEventPublisher` when family membership changes. These events are consumed by other modules (e.g., the notification module) using `@ApplicationModuleListener`.

| Event | Published When | Fields |
|-------|---------------|--------|
| `FamilyMemberAddedEvent` | New member added to a family | `familyId`, `userId`, `displayName`, `role` |
| `FamilyMemberRemovedEvent` | Member removed from a family | `familyId`, `userId`, `displayName` |
| `FamilyMemberRoleChangedEvent` | Member's role changed | `familyId`, `userId`, `displayName`, `newRole` |

Events are published within the `@Transactional` boundary of `FamilyService` methods, ensuring they are only dispatched if the transaction commits successfully. Spring Modulith's JDBC event publication store provides at-least-once delivery guarantees.

## 12. Module Structure (Spring Modulith)

```
auth/
  AuthModuleApi.java                  # Public interface for other modules
  AuthUser.java                       # Public record
  FamilyRole.java                     # Public enum
  ModulePermission.java               # Public enum
  RequiresModuleAccess.java           # Public annotation
  FamilyMemberAddedEvent.java         # Public domain event
  FamilyMemberRemovedEvent.java       # Public domain event
  FamilyMemberRoleChangedEvent.java   # Public domain event
  internal/                           # Hidden from other modules
    config/
    controller/
    dto/
    filter/
    repository/
    security/
    service/
```

Only types at the module root are accessible to other modules. Everything under `internal/` is enforced as module-private by Spring Modulith.

## 13. Validation Rules

| Field | Rules |
|-------|-------|
| email | Required, valid email format |
| password | Required, minimum 8 characters |
| displayName | Required, non-blank |
| familyName | Required, non-blank |
| role | Required, must be ADMIN, PARENT, or CHILD |
| moduleName | Required, non-blank |
| permission | Required, must be ACCESS or MANAGE |
| dayOfWeek | Required, 1–7 |
| startTime / endTime | Required, valid time |
| timezone | Required, non-blank |
