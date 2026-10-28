# Learning Module (Školní zoo) — Product Requirements Document

## 1. Overview

Školní zoo is the kids' learning app (`web-learning/`): short school exercises (column addition, Czech "vyjmenovaná slova", soft and hard i/y after consonants, paired consonants, bě/bje, endings, ú/ů, prefixes s-/z-/vz-, multiplication table) on a tablet. Finished work earns coins ("bodíky"), and coins buy enclosures, animals and decorations in a walkable zoo. The `learning` backend module connects the app to myhome: every child is a CHILD member of the family, their zoo is stored on the server, and parents see progress and can give bonus coins from the myhome web app.

The kids' app is a separate Vite build served by the backend at `/learning/`. It has its own Czech, tablet-first UI and does not use MUI. The parents' overview is a regular module page in `web/` at `/learning-progress`.

## 2. Goals

- A child's zoo survives a lost or reset tablet and is the same on every device
- Two children share one tablet: a parent signs each child in once, then switching is a tap on their avatar
- Parents use the existing family model: children need the `learning` module grant, and its schedules act as "zoo opening hours"
- Parents see what was practised and can reward extra work with bonus coins
- The app keeps working on a flaky connection; nothing a child earns is lost

## 3. Non-Goals

- Cheat-proof economy. Coins, prices and rewards are computed in the app (`economy.ts`, `catalog.ts`); the server stores the zoo as a document. A determined child could edit their own coins. That is acceptable for a family app.
- PIN or picture-password login for children (possible later, see 10)
- Zoos for parents. Only CHILD members have a zoo.
- Changing a sibling's zoo. Visits are read-only.

## 4. Roles & Permissions

| Role | Kids' app (`/learning/`) | Parents' page (`/learning-progress`) |
|---|---|---|
| ADMIN / PARENT | Cannot sign in ("Tohle je účet rodiče") | Progress of all children, give bonus coins, recent bonus coins |
| CHILD with `learning` ACCESS | Own zoo, exercises, read-only visits to siblings' zoos | Page shows only the link to the kids' app |
| CHILD without an active grant | "Zoo má přestávku" screen (403); nothing is lost | — |

Every endpoint is behind `@RequiresModuleAccess("learning")`. ADMIN and PARENT bypass it, as in all modules; the zoo endpoints themselves accept only CHILD users.

## 5. Core Concepts

### 5.1 Zoo document

One JSON document per child (`learning_zoos.state`): `schema`, `avatar`, `coins`, `earned`, `objects`, `animals`, `lastExerciseDay`, `createdAt`. The app owns its shape; the server only validates size (256 kB) and keeps a `version` for optimistic locking.

### 5.2 Sync

The app turns every change into an op (reward, build, feed, water, …) with ids and timestamps fixed at the time of the action. It shows `pending ops applied to the last saved copy`, saves 1.5 s after a change with the version it last saw, and on `409 Conflict` loads the server copy, replays its pending ops and saves again. Offline it keeps the ops in `localStorage` (`learning-zoo:<userId>`) and retries.

### 5.3 Token wallet

The kids' app keeps the tokens of every child signed in on the device (`learning-accounts`, separate from the web app's `auth-storage`). Switching child saves the previous child's work and makes the next child's tokens active. Refresh tokens rotate on use and expire after 7 days unused; after that a parent signs the child in again.

### 5.4 Exercise results

Each finished problem or round is appended to `learning_exercise_results` (exercise, raw event, coins, solved time). `clientId` makes resending the app's outbox idempotent. Parents' progress is computed from this log per local day.

### 5.5 Bonus coins

A parent's grant (`learning_coin_grants`) is pending until the child's app picks it up. The app adds the coins as an op and sends the grant id in the same save (`claimedGrantIds`). The server marks the grant claimed in the same transaction, and a grant that was already claimed makes the whole save fail with 409. A grant is therefore never lost or counted twice.

## 6. User Stories

### CHILD
- I tap my picture on the tablet and continue where I stopped, even if I last played on another tablet
- I pick how I look the first time; my zoo starts with 40 coins, a path, two trees and a flowerbed
- I solve exercises, earn coins (plus a daily bonus for the first exercise of the day), and buy things for my zoo
- I visit my sister's zoo and look around, but I cannot change it
- When it's not zoo time, I see a friendly "Zoo má přestávku" screen

### PARENT / ADMIN
- I add a child on the Family page, grant the `learning` module (optionally with a schedule), and sign the child in on the tablet once
- I see each child's coins, total earned coins and exercises per day for the last 14 days
- I give a child bonus coins with a note ("za uklizený pokoj"); the child sees it the next time the zoo opens, and I see it change from Waiting to Received

## 7. Requirements

### 7.1 Implemented
- LRN-01 Zoo document per child with optimistic versioning (409 on stale version, including a second "first save")
- LRN-02 Family zoo list for visits (own family only; former members are hidden)
- LRN-03 Idempotent exercise results log; daily totals per child, day (in the parent's timezone) and exercise
- LRN-04 Bonus coins claimed atomically with the zoo save
- LRN-05 Removing a member from the family deletes their learning data (`FamilyMemberRemovedEvent` listener)
- LRN-06 Kids' app: token wallet sign-in, avatar pick creates the zoo, offline cache with retry, read-only visits, closed screen on 403
- LRN-07 Parents' page in web: progress, bonus coins form, recent bonus coins

### 7.2 Future Considerations
- Child PIN login on a device a parent registered, so a week without playing does not need the password
- Per-child exercise settings (stars, voice) instead of per device
- Notifications to parents (e.g. weekly summary) via the notification module

## 8. REST API

| Method | Path | Who | Description |
|---|---|---|---|
| GET | `/api/learning/zoo` | CHILD | Own zoo (`state` null and `version` 0 until the first save) plus `pendingGrants` |
| PUT | `/api/learning/zoo` | CHILD | `{ version, state, claimedGrantIds? }` → `{ version }`; 409 on conflict, 413 when too large |
| GET | `/api/learning/zoos` | family | All zoos of current family members |
| POST | `/api/learning/results` | CHILD | `{ results: [{ clientId, exercise, event, coins, solvedAt }] }` (1–500) → 204 |
| GET | `/api/learning/progress?days=14&timezone=Europe/Prague` | ADMIN, PARENT | Per child: `coins`, `earned`, `days[{ date, exercise, count, coins }]`; 400 for an unknown timezone |
| GET | `/api/learning/grants` | ADMIN, PARENT | Last 50 bonus coin grants of the family |
| POST | `/api/learning/grants` | ADMIN, PARENT | `{ userId, amount (1–1000), note? }`; 400 if the user is not a child of the family |

## 9. Database Schema

```
learning_zoos              (family_id, user_id) PK, state JSONB, version, created_at, updated_at
learning_exercise_results  id, family_id, user_id, client_id, exercise, event JSONB, coins, solved_at, created_at
                           UNIQUE (user_id, client_id)
learning_coin_grants       id, family_id, user_id, amount > 0, note, granted_by, created_at, claimed_at
```

Migration: `V7__Create_learning_tables.sql`.

## 10. Serving

- `pnpm --filter web-learning build` writes to `backend/src/main/resources/learning-static/`, outside `static/` because the web build empties that folder. `LearningResourceConfig` maps `/learning/**` to it and `SpaForwardingController` serves `/learning/` (and redirects `/learning`).
- Exercises run in same-origin iframes, so `SecurityConfig` sends `X-Frame-Options: SAMEORIGIN`.
- Development: `pnpm dev:learning` (port 5175, `--host` for a tablet on the same Wi-Fi). The web dev server proxies `/learning/` to the backend.
