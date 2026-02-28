# Expense Module — Product Requirements Document

**Product:** myhome
**Module name:** `expenses`
**Author:** Matous Voldrich
**Status:** Draft
**Date:** 2026-02-25
**Version:** 2.0
**Dependencies:** auth-module, notification-module

---

## 1. Overview

The expense module allows family members to record, split, and reconcile shared costs within the myhome platform. Expenses are attributed to named groups (e.g. General, Skiing Trip, Sea Vacation) and split between family members according to configurable per-member percentages. A monthly summary dashboard aggregates all costs and presents each member's net balance. All monetary values are stored internally in CZK; amounts entered in any supported EU currency are automatically converted at the current ECB exchange rate.

The module integrates with the existing auth module (family/role model, module access system) and the notification module (real-time SSE push for new expenses).

---

## 2. Goals

1. Allow PARENT-role members to log shared expenses with per-group split configurations and automatic EUR/multi-currency → CZK conversion.
2. Provide a real-time running balance per family member so every family knows who owes whom without manual calculation.
3. Deliver a monthly summary dashboard with spend-by-group breakdown and debt-simplification (minimum settlement transactions).
4. Support all eight EU non-EUR currencies alongside EUR, with daily ECB rates sourced from the Frankfurter API.
5. Integrate seamlessly with the existing Spring Modulith architecture, module access system, and SSE notification pipeline.

---

## 3. Non-Goals

1. **Payment execution.** The module calculates and displays settlement amounts; it does not connect to banks, Revolut, PayPal, or any payment processor.
2. **Non-EU currencies.** USD, GBP, CHF and other non-EU-member currencies are out of scope for v1.
3. **Receipt OCR.** Manual expense entry only; photo scanning and auto-fill are a v2 feature.
4. **Per-group budget alerts.** Configurable spend limits and threshold notifications are deferred to v2.
5. **Recurring expenses.** Auto-generation of monthly/weekly expenses is a v2 feature.
6. **Mobile native app.** The frontend ships as a responsive web module only, consistent with the rest of the platform.

---

## 4. Roles & Permissions

The module reuses the family role model defined by the auth module.

| Role | Default behaviour | Expense module access |
|------|-------------------|-----------------------|
| **ADMIN** | Full automatic access to all modules | Full CRUD on all expenses and groups; can configure splits |
| **PARENT** | Requires explicit grant from ADMIN | With `ACCESS` grant: add/edit/delete own expenses, view all. With `MANAGE` grant: also manage groups and override any expense |
| **CHILD** | Requires explicit grant from ADMIN | With `ACCESS` grant: read-only view of expenses and balances |

Module access is controlled via the auth module's existing grant system using `moduleName = "expenses"` and `permission = ACCESS | MANAGE`.

---

## 5. Supported Currencies

All EU member state currencies (eurozone members contribute EUR):

| Code | Currency | Country/Zone |
|------|----------|--------------|
| CZK | Czech koruna | Czech Republic *(base currency)* |
| EUR | Euro | Eurozone (20 member states) |
| PLN | Polish złoty | Poland |
| HUF | Hungarian forint | Hungary |
| RON | Romanian leu | Romania |
| SEK | Swedish krona | Sweden |
| DKK | Danish krone | Denmark |
| BGN | Bulgarian lev | Bulgaria |
| HRK | Croatian kuna | Croatia *(legacy — Croatia joined EUR 2023; retained for historical records)* |

Exchange rates are sourced from the **Frankfurter API** (`api.frankfurter.dev`, ECB reference rates). All rates are cached server-side and refreshed once daily via a scheduled Spring `@Scheduled` job. The raw token is never called per-request.

---

## 6. Core Concepts

### 6.1 Expense Group

A named container scoping a set of related expenses within a family (e.g. "General", "Skiing Trip Jan 2026", "Sea Vacation Aug 2026"). Groups have an optional start/end date. A default "General" group is created automatically for every family and cannot be archived.

### 6.2 Expense

A single cost entry with a description, amount, currency, date, payer, and group. Each expense has an associated split defining each member's percentage share and their CZK-denominated obligation. The split defaults to the group's configured percentages but can be overridden per expense.

### 6.3 Family Split Configuration

Per-group, each ADMIN can assign a percentage to each PARENT member (CHILD members may also be assigned a share). Percentages across all included members must sum to 100 %. This becomes the default split for new expenses in that group and can be overridden.

### 6.4 Balance

The running net amount per member: total amount they paid minus total amount they owe (both in CZK). A positive balance means the member is owed money; negative means they owe money.

### 6.5 Monthly Summary

An aggregated view for a selected calendar month showing total spend, spend per group, each member's paid/owed totals, net balances, and a debt-simplification settlement plan.

---

## 7. User Stories

### ADMIN

- As an ADMIN, I want the expense module to be automatically accessible to me without needing a grant, so that I can manage family finances from day one.
- As an ADMIN, I want to create and configure expense groups with optional date ranges, so that trip-specific or period-specific costs are clearly separated.
- As an ADMIN, I want to set per-member split percentages per group so that recurring ratios (e.g. 60 %/40 %) are applied to new expenses without manual entry.
- As an ADMIN, I want to grant or revoke `ACCESS` and `MANAGE` permissions on the expenses module to PARENT and CHILD members, so that I control who can see or modify financial records.

### PARENT (with `ACCESS` or `MANAGE` grant)

- As a PARENT, I want to log an expense by entering description, amount, currency, date, payer, and group, so that shared costs are captured promptly.
- As a PARENT, I want to override the default split for a specific expense (e.g. "I paid for myself only"), so that exceptional one-off costs are recorded accurately.
- As a PARENT, I want to see a live balance widget at the top of the expenses page showing what I owe or am owed right now, so that I don't need to open the full summary.
- As a PARENT, I want to view a monthly summary with spend per group and a settlement plan, so that we can settle balances at month-end.
- As a PARENT with `MANAGE`, I want to edit or delete any expense in the family, so that I can correct errors made by other members.

### CHILD (with `ACCESS` grant)

- As a CHILD, I want to view the expense list and my personal balance, so that I understand the family's shared spending without being able to modify records.

---

## 8. Requirements

### 8.1 P0 — Must Have

#### Module Registration

- **MOD-01** The expenses module registers itself in the frontend `registry.ts` as:
  ```typescript
  { id: "expenses", name: "Expenses", description: "Track and split family costs",
    icon: <ReceiptLongIcon />, path: "/expenses", color: "#FF6B35" }
  ```
- **MOD-02** All expense routes are wrapped in `ProtectedRoute` + a module access guard that calls `hasModuleAccess(userId, familyId, "expenses", "ACCESS")` via `AuthModuleApi`.
  - *AC:* A family member without any grant sees a "Module not accessible" page with a request-access link.

#### Expense Groups

- **GRP-01** An ADMIN can create a group with: name (required), description (optional), start date (optional), end date (optional).
  - *AC:* Group name is unique within a family (case-insensitive).
- **GRP-02** Each family starts with a "General" group that cannot be archived or deleted.
- **GRP-03** An ADMIN can archive a group; archived groups accept no new expenses but remain visible in historical summaries.
- **GRP-04** Deleting a group is only permitted when it has zero expenses (ADMIN only).
- **GRP-05** ADMIN can configure per-member split percentages per group.
  - *AC:* Percentages across all included members must sum to 100 %; system rejects any save where sum ≠ 100 % with a validation error.

#### Expense CRUD

- **EXP-01** A PARENT (with `ACCESS` or `MANAGE`) or ADMIN can create an expense with the following fields:

  | Field | Type | Constraint |
  |-------|------|-----------|
  | `description` | String | Required, max 255 chars |
  | `amount` | Decimal | Required, > 0, max 2 decimal places |
  | `currency` | Enum | Required, one of: CZK, EUR, PLN, HUF, RON, SEK, DKK, BGN, HRK |
  | `date` | LocalDate | Required, defaults to today |
  | `paidByUserId` | Long | Required, must be a member of the family |
  | `groupId` | Long | Required, must belong to the family and not be archived |
  | `splits` | List | Optional override; if absent, group defaults apply |

- **EXP-02** On save, if `currency ≠ CZK`, the system fetches the cached rate and stores:
  - `original_amount`, `original_currency`
  - `czk_amount` (converted)
  - `exchange_rate` (rate used)
  - `rate_fetched_at` (timestamp of the cached rate)
  - *AC:* If the cached rate is older than 26 hours (ECB updates ~16:00 CET), a warning badge is shown on the expense and a background rate refresh is triggered.

- **EXP-03** Split override: a member can supply per-user percentage splits for a single expense.
  - *AC:* Split percentages must sum to 100 %; system rejects if not.
  - *AC:* If no override is supplied, group default splits are used and snapshotted at save time.

- **EXP-04** Edit: the expense creator or any member with `MANAGE` permission can edit all fields except `paidByUserId` (to prevent retroactive payment attribution confusion; a delete + re-add is required for payer changes).
  - *AC:* An edit audit trail record is written: `(expense_id, edited_by_user_id, changed_fields_json, edited_at)`.

- **EXP-05** Delete: soft-delete only. An ADMIN or `MANAGE` member (or creator) can delete.
  - *AC:* Deleted expenses are excluded from all balance calculations and summaries.
  - *AC:* An ADMIN can restore a soft-deleted expense within 90 days.

#### Currency & Exchange Rates

- **CUR-01** A Spring `@Scheduled` job runs daily at 17:00 CET, fetching updated rates for all 8 non-CZK currencies from `https://api.frankfurter.dev/v1/latest?base=CZK` and storing them in an `exchange_rates` table.
- **CUR-02** Rates are never called synchronously on expense save; the application always reads from the local cache.
- **CUR-03** If the scheduler fails to update for >26 hours, an application log `WARN` is emitted and the staleness badge appears on all non-CZK expenses saved during the outage.

#### Balances

- **BAL-01** The API exposes a `GET /api/expenses/balances` endpoint returning each family member's net balance in CZK (total paid − total owed, across all non-deleted expenses).
- **BAL-02** Balances update within the same request-response cycle after any expense create/edit/delete (no async jobs needed for correctness).
- **BAL-03** The frontend displays a balance chip per member on the main expenses page (green = positive, red = negative, neutral grey = zero).

#### Monthly Summary

- **SUM-01** `GET /api/expenses/summary?year={y}&month={m}` returns:
  - Total family spend for the month (CZK)
  - Spend per group (CZK)
  - Per-member totals: `paid`, `owed`, `balance`
  - Debt simplification: minimum list of `{ from, to, amount }` transactions to settle all balances in the month
- **SUM-02** The frontend renders a summary dashboard accessible via `/expenses/summary` with a month picker (defaults to current month).
- **SUM-03** Summary data is available for any past month with no time limit.

#### Notifications (integration with notification module)

- **NOT-01** When a new expense is added, the expense module publishes an `ExpenseAddedEvent` via `ApplicationEventPublisher`. The notification module listener creates an in-app notification for all family members except the creator.
  - Notification title: `"New expense added"`
  - Notification message: `"{creatorName} added "{description}" — {amount} {currency} ({czkAmount} CZK)"`
- **NOT-02** When an expense is deleted, an `ExpenseDeletedEvent` is published. Notification recipients: same as EXP-NOT-01.
  - Notification title: `"Expense removed"`
  - Notification message: `"{deletedByName} removed "{description}" ({czkAmount} CZK)"`

---

### 8.2 P1 — Nice to Have

- **EXP-P1-01** Recurring expenses — a flag on expense creation that auto-generates the same expense on the same day each month until cancelled.
- **GRP-P1-01** Per-group budget target (CZK); a progress bar on the group card showing spend vs. target.
- **SUM-P1-01** Export monthly summary as PDF or Excel via the existing `pdf` / `xlsx` skills.
- **CUR-P1-01** Manual rate override — ADMIN can enter a custom rate for a specific expense (useful for travel card fixed rates).
- **EXP-P1-02** Expense comment thread (same pattern as Splitwise) so members can attach context or receipts.

---

### 8.3 P2 — Future Considerations

- Additional non-EU currencies (USD, GBP, CHF, etc.).
- Receipt photo upload + OCR auto-fill.
- Czech Open Banking / PSD2 integration for automatic expense detection.
- Budget overspend push notifications.
- Multi-currency summary (show totals in EUR or user-preferred currency alongside CZK).

---

## 9. REST API

All endpoints require a valid JWT `Authorization: Bearer <token>` header. All endpoints enforce module access checks via `@RequiresModuleAccess("expenses")`.

### 9.1 Expense Groups

| Method | Path | Min Permission | Description |
|--------|------|---------------|-------------|
| GET | `/api/expenses/groups` | `ACCESS` | List all groups for the family |
| POST | `/api/expenses/groups` | `MANAGE` or ADMIN | Create a group |
| PUT | `/api/expenses/groups/{id}` | `MANAGE` or ADMIN | Update group name/dates |
| POST | `/api/expenses/groups/{id}/archive` | ADMIN | Archive a group |
| DELETE | `/api/expenses/groups/{id}` | ADMIN | Delete (only if no expenses) |
| PUT | `/api/expenses/groups/{id}/splits` | `MANAGE` or ADMIN | Set default split config |

**Create group — `POST /api/expenses/groups`**
```json
// Request
{ "name": "Skiing Trip Jan 2026", "description": "Val Thorens family trip", "startDate": "2026-01-15", "endDate": "2026-01-22" }

// Response
{ "id": 3, "name": "Skiing Trip Jan 2026", "description": "Val Thorens family trip", "startDate": "2026-01-15", "endDate": "2026-01-22", "archived": false, "splits": [] }
```

**Set splits — `PUT /api/expenses/groups/{id}/splits`**
```json
// Request
{ "splits": [ { "userId": 1, "sharePct": 60 }, { "userId": 2, "sharePct": 40 } ] }

// Response
{ "groupId": 3, "splits": [ { "userId": 1, "displayName": "Alice", "sharePct": 60 }, { "userId": 2, "displayName": "Bob", "sharePct": 40 } ] }
```

---

### 9.2 Expenses

| Method | Path | Min Permission | Description |
|--------|------|---------------|-------------|
| GET | `/api/expenses` | `ACCESS` | List expenses (paginated, filterable by group, month) |
| POST | `/api/expenses` | `ACCESS` | Add an expense |
| PUT | `/api/expenses/{id}` | `ACCESS` (own) / `MANAGE` (any) | Edit an expense |
| DELETE | `/api/expenses/{id}` | `ACCESS` (own) / `MANAGE` (any) | Soft-delete |
| POST | `/api/expenses/{id}/restore` | ADMIN | Restore soft-deleted expense |
| GET | `/api/expenses/{id}/history` | `ACCESS` | View edit audit trail |

**Add expense — `POST /api/expenses`**
```json
// Request
{
  "description": "Ski lift passes",
  "amount": 180.00,
  "currency": "EUR",
  "date": "2026-01-16",
  "paidByUserId": 1,
  "groupId": 3,
  "splits": [
    { "userId": 1, "sharePct": 60 },
    { "userId": 2, "sharePct": 40 }
  ]
}

// Response
{
  "id": 42,
  "description": "Ski lift passes",
  "originalAmount": 180.00,
  "originalCurrency": "EUR",
  "czkAmount": 4518.00,
  "exchangeRate": 25.10,
  "rateFetchedAt": "2026-01-16T16:05:00Z",
  "date": "2026-01-16",
  "paidBy": { "userId": 1, "displayName": "Alice" },
  "group": { "id": 3, "name": "Skiing Trip Jan 2026" },
  "splits": [
    { "userId": 1, "displayName": "Alice", "sharePct": 60, "czkAmount": 2710.80 },
    { "userId": 2, "displayName": "Bob", "sharePct": 40, "czkAmount": 1807.20 }
  ],
  "createdBy": 1,
  "createdAt": "2026-01-16T19:22:00Z"
}
```

**List expenses — `GET /api/expenses?groupId=3&year=2026&month=1&page=0&size=25`**
Returns a paginated list in descending date order. All query params are optional; without filters returns all non-deleted family expenses.

---

### 9.3 Balances & Summary

| Method | Path | Min Permission | Description |
|--------|------|---------------|-------------|
| GET | `/api/expenses/balances` | `ACCESS` | Current running balances for all family members |
| GET | `/api/expenses/summary?year={y}&month={m}` | `ACCESS` | Monthly summary + settlement plan |

**Balances — `GET /api/expenses/balances`**
```json
[
  { "userId": 1, "displayName": "Alice", "totalPaidCzk": 12400.00, "totalOwedCzk": 8500.00, "netBalanceCzk": 3900.00 },
  { "userId": 2, "displayName": "Bob",   "totalPaidCzk":  4100.00, "totalOwedCzk": 8000.00, "netBalanceCzk": -3900.00 }
]
```

**Monthly summary — `GET /api/expenses/summary?year=2026&month=1`**
```json
{
  "year": 2026,
  "month": 1,
  "totalCzk": 16500.00,
  "byGroup": [
    { "groupId": 3, "groupName": "Skiing Trip Jan 2026", "totalCzk": 12400.00 },
    { "groupId": 1, "groupName": "General",              "totalCzk":  4100.00 }
  ],
  "memberTotals": [
    { "userId": 1, "displayName": "Alice", "paidCzk": 12400.00, "owedCzk": 9900.00, "netCzk": 2500.00 },
    { "userId": 2, "displayName": "Bob",   "paidCzk":  4100.00, "owedCzk": 6600.00, "netCzk": -2500.00 }
  ],
  "settlementPlan": [
    { "fromUserId": 2, "fromDisplayName": "Bob", "toUserId": 1, "toDisplayName": "Alice", "amountCzk": 2500.00 }
  ]
}
```

---

### 9.4 Exchange Rates

| Method | Path | Min Permission | Description |
|--------|------|---------------|-------------|
| GET | `/api/expenses/rates` | `ACCESS` | Current cached rates (base CZK) and `fetchedAt` timestamp |

---

## 10. Domain Events

Published via `ApplicationEventPublisher` within `@Transactional` boundaries, persisted by Spring Modulith's JDBC event publication store for at-least-once delivery.

| Event | Published When | Key Fields |
|-------|---------------|------------|
| `ExpenseAddedEvent` | Expense created | `familyId`, `expenseId`, `description`, `originalAmount`, `originalCurrency`, `czkAmount`, `paidByUserId`, `createdByUserId` |
| `ExpenseEditedEvent` | Expense updated | `familyId`, `expenseId`, `description`, `editedByUserId`, `changedFields` |
| `ExpenseDeletedEvent` | Expense soft-deleted | `familyId`, `expenseId`, `description`, `czkAmount`, `deletedByUserId` |

The notification module handles these events by adding `EXPENSE_ADDED` and `EXPENSE_DELETED` to its `NotificationType` enum and `NotificationEventListener`.

---

## 11. Database Schema

Follows the same conventions as auth and notification modules (identity PKs, `ON DELETE CASCADE`, `TIMESTAMPTZ`).

```
exchange_rates
├── id (PK, identity)
├── currency_code (VARCHAR 3, unique)        -- EUR, PLN, HUF, RON, SEK, DKK, BGN, HRK
├── rate_to_czk (DECIMAL 12,6)               -- 1 unit of currency = X CZK
├── fetched_at (TIMESTAMPTZ)
└── UNIQUE(currency_code)

expense_groups
├── id (PK, identity)
├── family_id → families(id) ON DELETE CASCADE
├── name (VARCHAR 100)
├── description (VARCHAR 500, nullable)
├── start_date (DATE, nullable)
├── end_date (DATE, nullable)
├── archived (BOOLEAN, default FALSE)
├── is_default (BOOLEAN, default FALSE)      -- TRUE for the auto-created "General" group
├── created_at (TIMESTAMPTZ)
├── updated_at (TIMESTAMPTZ)
└── UNIQUE(family_id, name)

expense_group_splits
├── id (PK, identity)
├── group_id → expense_groups(id) ON DELETE CASCADE
├── user_id → users(id) ON DELETE CASCADE
├── share_pct (DECIMAL 5,2)                  -- e.g. 60.00
└── UNIQUE(group_id, user_id)

expenses
├── id (PK, identity)
├── family_id → families(id) ON DELETE CASCADE
├── group_id → expense_groups(id)            -- no cascade; group deletion guarded at app level
├── description (VARCHAR 255)
├── original_amount (DECIMAL 12,2)
├── original_currency (VARCHAR 3)
├── czk_amount (DECIMAL 12,2)
├── exchange_rate (DECIMAL 12,6)             -- NULL when original_currency = 'CZK'
├── rate_fetched_at (TIMESTAMPTZ, nullable)
├── expense_date (DATE)
├── paid_by_user_id → users(id)
├── created_by_user_id → users(id)
├── deleted_at (TIMESTAMPTZ, nullable)       -- NULL = active
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

expense_splits
├── id (PK, identity)
├── expense_id → expenses(id) ON DELETE CASCADE
├── user_id → users(id) ON DELETE CASCADE
├── share_pct (DECIMAL 5,2)
├── czk_amount (DECIMAL 12,2)               -- pre-computed: czk_amount * share_pct / 100
└── UNIQUE(expense_id, user_id)

expense_edit_history
├── id (PK, identity)
├── expense_id → expenses(id) ON DELETE CASCADE
├── edited_by_user_id → users(id)
├── changed_fields (JSONB)                  -- { "description": ["old", "new"], ... }
└── edited_at (TIMESTAMPTZ)

Indexes:
├── idx_expenses_family_date (family_id, expense_date DESC)        -- list + summary queries
├── idx_expenses_family_group (family_id, group_id)
├── idx_expenses_active (family_id, deleted_at) WHERE deleted_at IS NULL
├── idx_expense_splits_user (user_id)
```

---

## 12. Module Structure (Spring Modulith)

Follows the same structure as the auth and notification modules.

```
expenses/
  ExpenseModuleApi.java                 # Public interface for other modules
  ExpenseCurrency.java                  # Public enum (CZK, EUR, PLN, HUF, RON, SEK, DKK, BGN, HRK)
  ExpenseAddedEvent.java                # Public domain event
  ExpenseEditedEvent.java               # Public domain event
  ExpenseDeletedEvent.java              # Public domain event
  internal/
    config/
      ExpenseConfig.java                # Scheduling config (@EnableScheduling)
    controller/
      ExpenseGroupController.java
      ExpenseController.java
      ExpenseSummaryController.java
      ExchangeRateController.java
    dto/
      ExpenseGroupRequest.java / Response.java
      ExpenseRequest.java / Response.java
      SplitConfigRequest.java / Response.java
      BalanceResponse.java
      MonthlySummaryResponse.java
      ExchangeRateResponse.java
    repository/
      ExpenseGroupRepository.java
      ExpenseRepository.java
      ExpenseSplitRepository.java
      ExchangeRateRepository.java
      ExpenseEditHistoryRepository.java
    service/
      ExpenseGroupService.java
      ExpenseService.java
      BalanceService.java
      SummaryService.java
      ExchangeRateService.java          # Scheduled refresh + cache reads
      ExpenseNotificationListener.java  # Consumes own domain events if self-notification needed
```

---

## 13. Frontend Integration

The expense module lives at `web/src/modules/expenses/` following the same structure as the auth module.

### 13.1 Route Registration

```typescript
// web/src/router.tsx — add inside the AppShell ProtectedRoute children:
{ path: "/expenses",          element: <ExpensesPage /> }
{ path: "/expenses/summary",  element: <ExpenseSummaryPage /> }
{ path: "/expenses/groups",   element: <ExpenseGroupsPage /> }  // MANAGE/ADMIN only
```

### 13.2 Key Components

| Component | Description |
|-----------|-------------|
| `ExpensesPage` | Main page: balance chips row, group filter tabs, expense list |
| `ExpenseForm` | Add/edit expense dialog (MUI Dialog). Currency selector, amount, date picker, payer autocomplete, split override accordion |
| `BalanceChip` | Per-member chip: green (owed), red (owes), grey (settled) |
| `ExpenseSummaryPage` | Month picker + summary cards; settlement plan list |
| `ExpenseGroupsPage` | Group management table + split config form (ADMIN/MANAGE only) |
| `ExpenseGroupForm` | Create/edit group dialog |
| `SplitConfigForm` | Slider-based percentage allocation (validates sum to 100 %) |
| `CurrencyAmountDisplay` | Shows `4 518 CZK` with `€180 @ 25.10` tooltip |

### 13.3 State Management

- `expenseStore` — Zustand store holding current expenses list, filters, and balance state (persisted: no — always fetched fresh)
- All data fetching via orval-generated TanStack Query hooks from the OpenAPI spec
- Notifications arrive via the existing `notificationStore` / SSE pipeline — no additional store needed

### 13.4 Theme Alignment

Uses the existing MUI v6 theme palette (primary `#FF6B35`, secondary `#7B2D8E`, dark background `#1A1A2E`). No new theme tokens required.

---

## 14. Notification Module Extension

Add the following to the notification module to support expense events:

```java
// NotificationType.java — add:
EXPENSE_ADDED,
EXPENSE_DELETED
```

```java
// NotificationEventListener.java — add listeners:
@ApplicationModuleListener
void on(ExpenseAddedEvent event) { ... }

@ApplicationModuleListener
void on(ExpenseDeletedEvent event) { ... }
```

Recipient rule for both events: all family members with `ACCESS` or `MANAGE` grant on `"expenses"`, excluding the user who triggered the event.

---

## 15. Success Metrics

### Leading (within 4 weeks of launch)

| Metric | Target |
|--------|--------|
| Families with ≥ 1 expense logged | 30 % of active families |
| Average expenses per active family per week | ≥ 3 |
| Non-CZK expenses as share of total | ≥ 10 % (confirms currency feature is used) |
| Expense groups created per family (beyond General) | ≥ 1 |

### Lagging (at 90 days post-launch)

| Metric | Target |
|--------|--------|
| Monthly active families using expense module | 60 % of all families |
| Month-on-month retention of expense-using families | ≥ 75 % |
| Support tickets related to balance calculation errors | < 1 % of expense entries |
| Monthly summary page views per active family | ≥ 2 unique members per month |

---

## 16. Open Questions

| # | Question | Owner | Priority |
|---|----------|-------|----------|
| OQ-1 | Should PARENT members (not just ADMIN) be allowed to create and name expense groups? Currently spec'd as `MANAGE` or ADMIN only. | Product | High |
| OQ-2 | What happens to a member's split configuration and outstanding balances when they are removed from the family? Options: (a) freeze their balance and show as "Former member", (b) redistribute their share to remaining members pro-rata. | Product / Engineering | High |
| OQ-3 | Should soft-deleted expenses be permanently purged after 90 days, or retained indefinitely for GDPR audit purposes? | Legal | High |
| OQ-4 | Should HRK (Croatian kuna) be retained for historical entry support, or dropped entirely given Croatia joined EUR in 2023? | Product | Medium |
| OQ-5 | Should the monthly summary "lock" at month-end to prevent retroactive edits, or remain always editable? A locked summary improves auditability; always-editable improves flexibility. | Product | Medium |
| OQ-6 | Should CHILD members be allowed a non-zero split percentage (i.e. can they "owe" money), or should their share always be 0 % by convention? | Product | Medium |
| OQ-7 | Should `ExpenseEditedEvent` also trigger a notification, or only add/delete events? Edits may be noisy for small corrections. | Product | Low |

---

## 17. Timeline Considerations

Follows the phased approach consistent with other modules.

| Phase | Scope | Suggested Duration |
|-------|-------|--------------------|
| **Alpha** | Expense CRUD (CZK only), groups, balances, basic list view | 2 weeks |
| **Beta** | Multi-currency + ECB rate scheduler, monthly summary, split override, SSE notifications | 2 weeks |
| **v1.0 Launch** | All P0 requirements, full frontend, module access guard | 1 week polish + QA |
| **v1.1** | P1 features: recurring expenses, PDF/Excel export, per-group budgets | Next sprint |

No hard external deadline identified. Total estimated time to v1.0: **5–6 weeks** from engineering kick-off.