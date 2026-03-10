# Expense Module — Product Requirements Document

**Product:** myhome
**Module name:** `expenses`
**Author:** Matous Voldrich
**Status:** Implemented
**Date:** 2026-02-28
**Version:** 4.0
**Dependencies:** auth-module, notification-module

---

## 1. Overview

The expense module allows family members to record, split, and reconcile shared costs within the myhome platform. Expenses are attributed to named groups (e.g. General, Skiing Trip, Sea Vacation) and split between family members according to configurable per-member percentages. A monthly summary dashboard aggregates all costs and presents each member's net balance. All monetary values are stored internally in CZK; amounts entered in any supported EU currency are automatically converted at the current ECB exchange rate.

The module integrates with the existing auth module (family/role model, module access system) and the notification module (real-time SSE push for new expenses).

---

## 2. Goals

1. Allow family members to log shared expenses with per-group split configurations and automatic EUR/multi-currency → CZK conversion.
2. Provide a real-time running balance per family member so every family knows who owes whom without manual calculation.
3. Deliver a monthly summary dashboard with spend-by-group breakdown and debt-simplification (minimum settlement transactions).
4. Support all eight EU non-EUR currencies alongside EUR, with daily ECB rates sourced from the Frankfurter API.
5. Integrate seamlessly with the existing Spring Modulith architecture, module access system, and SSE notification pipeline.
6. Allow CHILD members controlled, scoped access — they see only groups configured as `allowChildren=true` and can view (but not freely edit) expenses.

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
| **ADMIN** | Full automatic access to all modules | Full CRUD on all expenses and groups; can configure splits; sees `canEdit=true` on all expenses; sees Manage Groups tab |
| **PARENT** | Requires explicit grant from ADMIN | With `ACCESS` grant: add/edit/delete own expenses, view all groups. With `MANAGE` grant: also manage groups and override any expense. Sees `canEdit=true` on own expenses; `canEdit=false` on others' (unless MANAGE). |
| **CHILD** | Requires explicit grant from ADMIN | With `ACCESS` grant: view expenses and balances; can add expenses to `allowChildren=true` groups only; can edit/delete own expenses only (`canEdit=true` on own, `false` on others). Edit/delete buttons are always rendered but disabled when `canEdit=false`. |

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

Exchange rates are sourced from the **Frankfurter API** (`api.frankfurter.dev`, ECB reference rates). All rates are cached server-side and refreshed once daily via a scheduled Spring `@Scheduled` job. The raw API is never called per-request.

---

## 6. Core Concepts

### 6.1 Expense Group

A named container scoping a set of related expenses within a family (e.g. "General", "Skiing Trip Jan 2026", "Sea Vacation Aug 2026"). Groups have an optional start/end date. A default "General" group is created automatically for every family and cannot be archived or deleted.

Each group has an `allowChildren` boolean (default `true` for new groups). When `allowChildren=false`, CHILD members cannot see expenses in that group or add expenses to it. The "General" default group is always `allowChildren=false` and this cannot be overridden. Group management (create, edit, archive, delete) is accessible from the **Manage Groups** tab inside `ExpensesPage` — there is no separate `/expenses/groups` route.

### 6.2 Expense

A single cost entry with a description, amount, currency, date, payer, and group. Each expense has an associated split defining each member's percentage share and their CZK-denominated obligation. The split defaults to the group's configured percentages but can be overridden per expense.

Each `ExpenseResponse` includes a `canEdit` boolean computed server-side: `true` if the requesting user created the expense or has MANAGE/ADMIN access. The UI always renders edit/delete buttons, disabling them when `canEdit=false`.

### 6.3 Family Split Configuration

Per-group, an ADMIN can assign a percentage to each member. Percentages across all included members must sum to 100 %. This becomes the default split for new expenses in that group and can be overridden per expense.

### 6.4 Balance

The running net amount per member: total amount they paid minus total amount they owe (both in CZK). A positive balance means the member is owed money; negative means they owe money.

### 6.5 Monthly Summary

An aggregated view for a selected calendar month showing total spend, spend per group, each member's paid/owed totals, net balances, and a debt-simplification settlement plan.

---

## 7. User Stories

### ADMIN

- As an ADMIN, I want the expense module to be automatically accessible to me without needing a grant, so that I can manage family finances from day one.
- As an ADMIN, I want to create and configure expense groups (with optional date ranges and `allowChildren` flag) so that trip-specific costs are clearly separated and CHILD visibility is controlled.
- As an ADMIN, I want to set per-member split percentages per group so that recurring ratios (e.g. 60 %/40 %) are applied to new expenses without manual entry.
- As an ADMIN, I want to grant or revoke `ACCESS` and `MANAGE` permissions on the expenses module to PARENT and CHILD members, so that I control who can see or modify financial records.
- As an ADMIN, I want to manage groups from a tab within the Expenses page, so I don't need to navigate to a separate admin page.

### PARENT (with `ACCESS` or `MANAGE` grant)

- As a PARENT, I want to log an expense by entering description, amount, currency, date, payer, and group, so that shared costs are captured promptly.
- As a PARENT, I want to override the default split for a specific expense (e.g. "I paid for myself only"), so that exceptional one-off costs are recorded accurately.
- As a PARENT, I want to see a live balance widget at the top of the expenses page showing what I owe or am owed right now, so that I don't need to open the full summary.
- As a PARENT, I want to view a monthly summary with spend per group and a settlement plan, so that we can settle balances at month-end.
- As a PARENT with `MANAGE`, I want to edit or delete any expense in the family, so that I can correct errors made by other members.

### CHILD (with `ACCESS` grant)

- As a CHILD, I want to view expenses in groups that allow children's access, so that I can follow the family's shared spending.
- As a CHILD, I want to add expenses to groups where children are allowed, so that I can record my own purchases.
- As a CHILD, I want to edit or delete my own expenses (and only mine), so that I can correct my mistakes.
- As a CHILD, I want to see edit/delete buttons in the list so I know the feature exists, but they should be greyed out on expenses I didn't create.

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

- **GRP-01** An ADMIN (or MANAGE-granted member) can create a group with: name (required), description (optional), start date (optional), end date (optional), `allowChildren` (optional, defaults to `true`).
  - *AC:* Group name is unique within a family (case-insensitive).
- **GRP-02** Each family starts with a "General" group that cannot be archived or deleted. The "General" group always has `allowChildren=false`; this cannot be overridden via update.
- **GRP-03** An ADMIN can archive a group; archived groups accept no new expenses but remain visible in historical summaries.
- **GRP-04** Deleting a group is only permitted when it has zero expenses (ADMIN only).
- **GRP-05** ADMIN can configure per-member split percentages per group.
  - *AC:* Percentages across all included members must sum to 100 %; system rejects any save where sum ≠ 100 % with a validation error.
- **GRP-06** Group management (create, edit, archive, delete) is accessible from the **Manage Groups** tab inside `ExpensesPage`. The tab is only visible to ADMIN and PARENT users. No separate `/expenses/groups` route exists.
- **GRP-07** CHILD members with `ACCESS` only see groups where `allowChildren=true` (filtered server-side). They cannot add expenses to groups with `allowChildren=false`.
  - *AC:* `GET /api/expenses/groups` returns only `allowChildren=true` groups for CHILD role.
  - *AC:* `POST /api/expenses` to a group with `allowChildren=false` returns HTTP 403 for CHILD users.

#### Expense CRUD

- **EXP-01** A member with `ACCESS` (or `MANAGE`) grant or ADMIN can create an expense with the following fields:

  | Field | Type | Constraint |
  |-------|------|-----------|
  | `description` | String | Required, max 255 chars |
  | `amount` | Decimal | Required, > 0, max 2 decimal places |
  | `currency` | Enum | Required, one of: CZK, EUR, PLN, HUF, RON, SEK, DKK, BGN, HRK |
  | `date` | LocalDate | Required, defaults to today |
  | `paidByUserId` | Long | Required, must be a member of the family |
  | `groupId` | Long | Required, must belong to the family and not be archived |
  | `splits` | List | Optional override; if absent, group defaults apply |

  - *AC:* CHILD users cannot create expenses in groups with `allowChildren=false`.

- **EXP-02** On save, if `currency ≠ CZK`, the system fetches the cached rate and stores:
  - `original_amount`, `original_currency`
  - `czk_amount` (converted)
  - `exchange_rate` (rate used)
  - `rate_fetched_at` (timestamp of the cached rate)

- **EXP-03** Split override: a member can supply per-user percentage splits for a single expense.
  - *AC:* Split percentages must sum to 100 %; system rejects if not.
  - *AC:* If no override is supplied, group default splits are used and snapshotted at save time.

- **EXP-04** Edit: the expense creator or any member with `MANAGE` permission can edit all fields.
  - *AC:* An edit audit trail record is written: `(expense_id, edited_by_user_id, changed_fields_json, edited_at)`.
  - *AC:* `ExpenseResponse` includes `canEdit: boolean` — `true` if the requesting user created the expense or has MANAGE/ADMIN access.
  - *AC:* Edit and delete buttons in the UI are always rendered but `disabled` when `canEdit=false`.

- **EXP-05** Delete: soft-delete only. The expense creator or any member with `MANAGE`/ADMIN can delete.
  - *AC:* Deleted expenses are excluded from all balance calculations and summaries.
  - *AC:* An ADMIN can restore a soft-deleted expense within 90 days.

#### Currency & Exchange Rates

- **CUR-01** A Spring `@Scheduled` job runs daily at 17:00 CET, fetching updated rates for all 8 non-CZK currencies from `https://api.frankfurter.dev/v1/latest?base=CZK` and storing them in an `exchange_rates` table.
- **CUR-02** Rates are never called synchronously on expense save; the application always reads from the local cache.

#### Balances

- **BAL-01** The API exposes a `GET /api/expenses/balances` endpoint returning each family member's net balance in CZK (total paid − total owed, across all non-deleted expenses).
- **BAL-02** Balances update within the same request-response cycle after any expense create/edit/delete.
- **BAL-03** The frontend displays a balance chip per member on the main expenses page (green = positive, red = negative, neutral grey = zero).

#### Monthly Summary

- **SUM-01** `GET /api/expenses/summary?year={y}&month={m}` returns:
  - Total family spend for the month (CZK)
  - Spend per group (CZK) with per-member paid breakdown (`memberPaid` array per group: `userId`, `displayName`, `paidCzk`)
  - Per-member totals: `paid`, `owed`, `balance`
  - Debt simplification: minimum list of `{ from, to, amount }` transactions to settle all balances in the month
- **SUM-02** The frontend renders a summary dashboard accessible via `/expenses/summary` with a month picker (defaults to current month). Each expense group is visualized as a **pie chart** where slices represent each family member's total paid amount in that group. Family members are assigned consistent colors (Tableau 10 palette) used throughout the system.
- **SUM-03** Summary data is available for any past month with no time limit.

#### Notifications (integration with notification module)

- **NOT-01** When a new expense is added, the expense module publishes an `ExpenseAddedEvent` via `ApplicationEventPublisher`. The notification module listener creates an in-app notification for all family members except the creator.
  - Notification title: `"New expense added"`
  - Notification message: `"{creatorName} added "{description}" — {amount} {currency} ({czkAmount} CZK)"`
- **NOT-02** When an expense is deleted, an `ExpenseDeletedEvent` is published. Notification recipients: same as NOT-01.
  - Notification title: `"Expense removed"`
  - Notification message: `"{deletedByName} removed "{description}" ({czkAmount} CZK)"`

---

### 8.2 CSV Import (Implemented)

#### Privacy Model

Imported expenses start as **private** (unassigned — `group_id IS NULL`). They are visible only to the importer until assigned to an expense group, at which point they become shared and appear in family summaries.

- **Unassigned expenses** are excluded from balance calculations and monthly summaries.
- **Unassigned expenses** appear only in the importing user's "Unassigned" tab — other family members cannot see them.
- Once a group is assigned (via edit), the expense becomes shared and is counted in balances and summaries.

#### IMP-01 — Upload CSV (ADMIN/PARENT)

A member with ADMIN or PARENT role can upload a bank CSV file via `POST /api/expenses/import`.

- *AC:* Only outgoing transactions (negative `Zaúčtovaná částka`) are imported; incoming transfers are silently skipped and counted as `skipped`.
- *AC:* Transactions already imported by this user (`created_by_user_id` + `external_transaction_id` unique) are detected and counted as `skipped` (no duplicate created).
- *AC:* Response: `{ imported, skipped, failed, errors }`.
- *AC:* Each imported expense has `import_source = "RAIFFEISEN"` and `external_transaction_id` from the `Id transakce` column.
- *AC:* Description is resolved by priority: `Název obchodníka` → `Název protiúčtu` → first segment of `Zpráva`.
- *AC:* `paid_by_user_id` is set to the importing user.

#### IMP-02 — View Unassigned Expenses

- `GET /api/expenses?unassigned=true` returns only the requesting user's unassigned expenses (`group_id IS NULL AND created_by_user_id = :userId`).
- The frontend shows an **Unassigned** tab in the group filter tabs.
- Unassigned expenses show an "Unassigned" chip (warning color) instead of a group chip.

#### IMP-03 — Assign to Group

- Editing an unassigned expense and selecting a group assigns it: `PUT /api/expenses/{id}` with `groupId` set.
- Once assigned, the expense appears in the group view and is counted in balances and summaries.

#### IMP-04 — Supported Banks

| Bank | import_source value | CSV format |
|------|---------------------|-----------|
| Raiffeisen CZ | `RAIFFEISEN` | Semicolon-delimited, UTF-8, date `dd.MM.yyyy`, comma decimal |

The import is extensible: additional banks can be added by implementing the same CSV column mapping pattern and passing a different `source` parameter.

#### CSV Column Mapping (Raiffeisen)

| CSV column | DB field | Notes |
|---|---|---|
| `Datum provedení` | `expense_date` | Format `dd.MM.yyyy` |
| `Zaúčtovaná částka` | `original_amount` | Comma decimal, abs value stored |
| `Měna účtu` | `original_currency` | Direct |
| `Id transakce` | `external_transaction_id` | Deduplication |
| `Název obchodníka` / `Název protiúčtu` / `Zpráva` | `description` | Priority fallback |

---

### 8.3 P1 — Nice to Have

- **EXP-P1-01** Recurring expenses — a flag on expense creation that auto-generates the same expense on the same day each month until cancelled.
- **GRP-P1-01** Per-group budget target (CZK); a progress bar on the group card showing spend vs. target.
- **SUM-P1-01** Export monthly summary as PDF or Excel.
- **CUR-P1-01** Manual rate override — ADMIN can enter a custom rate for a specific expense (useful for travel card fixed rates).
- **EXP-P1-02** Expense comment thread so members can attach context or receipts.

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
| GET | `/api/expenses/groups` | `ACCESS` | List groups (CHILD: only `allowChildren=true` groups) |
| POST | `/api/expenses/groups` | `MANAGE` or ADMIN | Create a group |
| PUT | `/api/expenses/groups/{id}` | `MANAGE` or ADMIN | Update group fields (incl. allowChildren) |
| POST | `/api/expenses/groups/{id}/archive` | ADMIN | Archive a group |
| DELETE | `/api/expenses/groups/{id}` | ADMIN | Delete (only if no expenses) |
| PUT | `/api/expenses/groups/{id}/splits` | `MANAGE` or ADMIN | Set default split config |

**`ExpenseGroupRequest`**
```json
{
  "name": "Skiing Trip Jan 2026",
  "description": "Val Thorens family trip",
  "startDate": "2026-01-15",
  "endDate": "2026-01-22",
  "allowChildren": true
}
```

**`ExpenseGroupResponse`**
```json
{
  "id": 3,
  "name": "Skiing Trip Jan 2026",
  "description": "Val Thorens family trip",
  "startDate": "2026-01-15",
  "endDate": "2026-01-22",
  "archived": false,
  "isDefault": false,
  "allowChildren": true,
  "splits": []
}
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
| GET | `/api/expenses` | `ACCESS` | List expenses; `?unassigned=true` returns only the user's unassigned expenses |
| POST | `/api/expenses` | `ACCESS` | Add an expense (groupId required for manual creation) |
| POST | `/api/expenses/import` | ADMIN/PARENT | Import CSV from bank (multipart/form-data, `file` field) |
| PUT | `/api/expenses/{id}` | `ACCESS` (own) / `MANAGE` (any) | Edit an expense; if `groupId` is null, keeps existing group |
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
  "createdAt": "2026-01-16T19:22:00Z",
  "deletedAt": null,
  "canEdit": true
}
```

**List expenses — `GET /api/expenses?groupId=3&year=2026&month=1&page=0&size=25`**

Returns a paginated wrapper `{ content, totalElements, page, size }`. All query params optional. CHILD users automatically see only expenses belonging to `allowChildren=true` groups (server-enforced, regardless of `groupId` param).

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
| `ExpenseEditedEvent` | Expense updated | `familyId`, `expenseId`, `description`, `editedByUserId` |
| `ExpenseDeletedEvent` | Expense soft-deleted | `familyId`, `expenseId`, `description`, `czkAmount`, `deletedByUserId` |

The notification module handles these events via `NotificationEventListener` using `EXPENSE_ADDED` and `EXPENSE_DELETED` notification types.

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
├── allow_children (BOOLEAN, default TRUE)   -- FALSE for default group; controls CHILD visibility
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
├── group_id → expense_groups(id) NULLABLE   -- NULL = unassigned/private (CSV-imported, not yet assigned to a group)
├── description (VARCHAR 255)
├── original_amount (DECIMAL 12,2)
├── original_currency (VARCHAR 3)
├── czk_amount (DECIMAL 12,2)
├── exchange_rate (DECIMAL 12,6)             -- NULL when original_currency = 'CZK'
├── rate_fetched_at (TIMESTAMPTZ, nullable)
├── expense_date (DATE)
├── paid_by_user_id → users(id)
├── created_by_user_id → users(id)
├── import_source (VARCHAR 50, nullable)     -- e.g. 'RAIFFEISEN'; NULL for manually entered expenses
├── external_transaction_id (VARCHAR 100, nullable) -- bank's transaction ID for deduplication
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

Flyway migrations:
- `V3__Create_expense_tables.sql` — initial schema
- `V4__Add_allow_children_to_expense_groups.sql` — adds `allow_children` column, sets `FALSE` for existing default groups
- `V5__Add_csv_import_support.sql` — makes `group_id` nullable; adds `import_source`, `external_transaction_id`; adds unique index for deduplication

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
      ExpenseGroupRequest.java          -- name, description, startDate, endDate, allowChildren
      ExpenseGroupResponse.java         -- id, name, description, dates, archived, isDefault, allowChildren, splits
      ExpenseRequest.java / Response.java  -- Response includes canEdit
      SplitConfigRequest.java / Response.java
      BalanceResponse.java
      MonthlySummaryResponse.java
      ExchangeRateResponse.java
    repository/
      ExpenseGroupRepository.java       -- findAllowedGroupIds(familyId) for CHILD filtering
      ExpenseRepository.java            -- findByFamily/countByFamily accept allowedGroupIds
      ExpenseSplitRepository.java
      ExchangeRateRepository.java
      ExpenseEditHistoryRepository.java
    service/
      ExpenseGroupService.java          -- listGroups(AuthUser) for role-aware filtering
      ExpenseService.java               -- listExpenses(AuthUser, ...) for canEdit + CHILD group filter
      BalanceService.java
      SummaryService.java
      ExchangeRateService.java          # Scheduled refresh + cache reads
      ExpenseModuleStartup.java         # Creates default group on family registration
```

---

## 13. Frontend Integration

The expense module lives at `web/src/modules/expenses/`.

### 13.1 Route Registration

```typescript
// web/src/router.tsx
{ path: "/expenses",         element: <ExpensesPage /> }
{ path: "/expenses/summary", element: <ExpenseSummaryPage /> }
// Note: /expenses/groups route removed — group management is a tab within ExpensesPage
```

### 13.2 Key Components

| Component | Description |
|-----------|-------------|
| `ExpensesPage` | Main page with two tabs: **Expenses** (balance chips, group filter tabs, expense list) and **Manage Groups** (group table with edit/archive/delete, `allowChildren` chip; tab visible to ADMIN/PARENT only) |
| `ExpenseForm` | Add/edit expense dialog. Currency selector, amount, date picker, payer autocomplete, split override accordion |
| `BalanceChip` | Per-member chip: green (owed), red (owes), grey (settled) |
| `ExpenseSummaryPage` | Month picker + summary cards; settlement plan list |
| `ExpenseGroupForm` | Create/edit group dialog with `allowChildren` Switch (hidden for default group) |
| `CurrencyAmountDisplay` | Shows primary amount with CZK conversion tooltip |

### 13.3 Edit/Delete Button Behaviour

Edit and delete buttons are rendered for every expense row regardless of role. They are enabled/disabled based on the server-provided `canEdit` field:

```tsx
<IconButton disabled={!expense.canEdit} onClick={() => setEditExpense(expense)}>
  <EditIcon />
</IconButton>
```

No client-side role check is needed — the server computes `canEdit` per-expense.

### 13.4 API Code Generation

All API types and hooks are generated via Orval from the backend's OpenAPI spec:
- `common/src/api/generated/` — framework-agnostic fetch functions and TypeScript types
- `web/src/api/generated/` — TanStack Query v5 hooks

Run `pnpm generate-api` from the project root to regenerate after backend changes.

### 13.5 Theme Alignment

Uses the existing MUI v6 theme palette (primary `#FF6B35`, secondary `#7B2D8E`, dark background `#1A1A2E`). No new theme tokens required.

---

## 14. Notification Module Extension

The notification module has been extended to handle expense events:

```java
// NotificationType.java
EXPENSE_ADDED,
EXPENSE_DELETED

// NotificationEventListener.java
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

| # | Question | Owner | Priority | Status |
|---|----------|-------|----------|--------|
| OQ-1 | Should PARENT members (not just ADMIN) be allowed to create and name expense groups? | Product | High | **Resolved:** MANAGE-granted members (including PARENT with MANAGE) can create/edit groups. |
| OQ-2 | What happens to a member's split configuration and outstanding balances when they are removed from the family? | Product / Engineering | High | Open |
| OQ-3 | Should soft-deleted expenses be permanently purged after 90 days, or retained indefinitely for GDPR audit purposes? | Legal | High | Open |
| OQ-4 | Should HRK (Croatian kuna) be retained for historical entry support, or dropped entirely given Croatia joined EUR in 2023? | Product | Medium | Open |
| OQ-5 | Should the monthly summary "lock" at month-end to prevent retroactive edits, or remain always editable? | Product | Medium | Open |
| OQ-6 | Should CHILD members be allowed a non-zero split percentage (i.e. can they "owe" money)? | Product | Medium | **Resolved:** CHILD members can have split percentages and are listed as owing money. The `allowChildren` flag on the group controls whether they can interact with it at all. |
| OQ-7 | Should `ExpenseEditedEvent` also trigger a notification, or only add/delete events? | Product | Low | Open |
