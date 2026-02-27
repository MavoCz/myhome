# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Spring Boot 4.0.2 backend template using Java 25, Gradle 9.3.0 (Kotlin DSL), and Spring Modulith for modular monolith architecture. The project lives in the `backend/` directory.

**Base package:** `net.voldrich.myhome.backend`

## Prerequisites

- **Java 25** via SDKMAN: `sdk install java 25.0.2-tem`
- **Docker** (required for PostgreSQL via Docker Compose, and JOOQ code generation)

## Build & Development Commands

All Gradle commands run from `backend/`:

```bash
./gradlew build              # Full build with tests
./gradlew bootRun            # Run app (port 8080, auto-starts PostgreSQL via Docker Compose)
./gradlew test               # Run all tests
./gradlew test --tests "ClassName"           # Single test class
./gradlew test --tests "ClassName.methodName" # Single test method
./gradlew jooqCodegen        # Generate JOOQ classes (requires Docker)
./gradlew generateOpenApiDocs # Export OpenAPI spec to build/docs/openapi.json (auto-starts PostgreSQL)
./gradlew bootJar            # Build executable JAR
./gradlew bootBuildImage     # Build OCI container image
```

Run from project root:

```bash
pnpm generate-api            # Export OpenAPI spec + generate TypeScript types & React Query hooks
```

### Database via Docker Compose

PostgreSQL is managed automatically by Spring Boot Docker Compose support (`backend/compose.yml`). Running `./gradlew bootRun` auto-starts the PostgreSQL container. No manual Docker commands needed.

- **Fresh database:** `docker compose -f backend/compose.yml down -v` then restart the app
- **Credentials:** root/root (configured in `compose.yml` and `application.properties`)
- **Port:** 5433 (mapped from container's 5432)


## Architecture

### Spring Modulith (Modular Monolith)

Modules are direct sub-packages under the base package. Spring Modulith enforces boundaries — only types at the module root are public API; anything in `internal/` is hidden from other modules.

```
net.voldrich.myhome.backend/
├── auth/                    # Auth module public API (AuthModuleApi, AuthUser, annotations)
│   └── internal/            # Hidden: controllers, services, repositories, filters, DTOs
├── jooq/                    # Generated JOOQ classes (build/generated-sources/jooq)
└── BackendSpringApplication.java
```

### Auth Module

The currently implemented module provides JWT authentication and family-based authorization:

- **JWT:** HMAC-SHA256 access tokens (15min) + opaque UUID refresh tokens (7 days, rotated on use, SHA-256 hashed in DB)
- **Family model:** Users belong to families with PARENT/CHILD roles. Parents have full access; children require explicit module access grants with optional time windows and day-of-week schedules.
- **Public API** exposed to other modules: `AuthModuleApi` interface, `AuthUser` record, `@RequiresModuleAccess` annotation, `FamilyRole`/`ModulePermission` enums
- **Endpoints:** `/api/auth/*` (register, login, refresh, logout), `/api/family/members/*`, `/api/family/module-access/*`

### Database

- **JOOQ** for type-safe SQL (not an ORM) — repositories use the JOOQ DSL directly
- **Flyway** migrations in `src/main/resources/db/migration/` with naming `V{version}__{description}.sql`
- **JOOQ codegen** (`./gradlew jooqCodegen`) spins up a PostgreSQL Testcontainer, runs Flyway migrations, and generates classes into `build/generated-sources/jooq`. Custom Testcontainer logic is in `buildSrc/`.

### Key Patterns

- Constructor injection (no `@Autowired`)
- Java records for DTOs
- `@Transactional` on service methods for DB operations
- Jakarta Validation on request DTOs
- Swagger UI available at `/swagger-ui.html` (SpringDoc OpenAPI)
- Config properties bound via `@ConfigurationProperties` (e.g., `JwtProperties` for `app.jwt.*`)

## Frontend

The frontend is a React + TypeScript SPA served from the backend's `static/` directory. It uses a pnpm workspace with two packages:

- **`common/`** — Shared API types + fetch client (no React deps). Used by both web and future React Native apps.
- **`web/`** — React SPA with Vite, MUI v6, React Router v7, Zustand, TanStack Query v5.


### Frontend Commands

Run from project root:

```bash
pnpm install                 # Install all dependencies
pnpm dev                     # Start Vite dev server (port 5173, proxies /api to :8080)
pnpm build                   # Build SPA → backend/src/main/resources/static/
pnpm generate-api            # Export OpenAPI spec + regenerate TypeScript types & hooks
```

### API Code Generation (Orval)

[Orval](https://orval.dev) generates TypeScript types and API client code from the backend's OpenAPI spec. Config is in `orval.config.ts` at the project root with two targets:

- **`common`** target → `common/src/api/generated/` — framework-agnostic fetch functions and TypeScript model types (shared between web and future mobile apps)
- **`web`** target → `web/src/api/generated/` — React Query hooks for TanStack Query v5

Both targets use `common/src/api/client.ts` (`customFetch`) as their HTTP mutator. The `customFetch` function handles both calling conventions: `(url: string, options)` for direct use and `({url, method, data, params}, options)` for Orval-generated code.

The OpenAPI spec is exported to `backend/build/docs/openapi.json` via the `springdoc-openapi-gradle-plugin`. Running `pnpm generate-api` handles everything: it starts the backend (with auto-managed PostgreSQL), exports the spec, stops the backend, and runs Orval. No manually running server needed.

**When to regenerate:** After any backend endpoint change (new endpoints, modified request/response DTOs, changed URL paths).

**Generated files are committed** to the repo so frontend builds work without the backend running.

### Frontend Architecture

- **API codegen:** Orval generates fetch functions into `common/` and React Query hooks into `web/` from the backend's OpenAPI spec
- **Auth:** Zustand store with localStorage persistence, custom fetch client with automatic JWT refresh
- **Theming:** MUI v6 with light/dark mode toggle, vibrant family-oriented palette
- **Modules:** Frontend modules mirror backend Spring Modulith modules in `web/src/modules/`
- **Routing:** React Router v7 with protected/public route guards
- **SPA serving:** `SpaForwardingController` forwards non-file routes to `index.html`

## Feature Implementation Workflow

When implementing a new feature, follow these steps in order:

1. **Database changes** — Write Flyway migration(s) in `backend/src/main/resources/db/migration/`
2. **JOOQ codegen** — Run `./gradlew jooqCodegen` (from `backend/`) to regenerate type-safe table classes
3. **Backend implementation** — Implement repositories, services, controllers, DTOs
4. **API codegen** — Run `pnpm generate-api` (from project root) to export the OpenAPI spec and generate TypeScript types + React Query hooks
5. **Frontend implementation** — Build UI using the generated API types and hooks; add `data-testid` attributes to all interactive elements (see UI Testability below)
6. **E2E tests** — Write Playwright tests covering the new feature (both API and UI, see below)
7. **Run tests** — Run `./gradlew test` (from `backend/`) after backend changes, `pnpm test:api` and/or `pnpm test:web` after frontend/E2E changes, and fix any failures

## E2E Tests

E2E tests live in `e2e/` and use Playwright. **Always write E2E tests when adding or modifying any feature** by invoking the `/e2e` skill.

```bash
pnpm test:api    # API-only tests (from project root)
pnpm test:web    # Full-stack browser tests (from project root)
```

**Always run the relevant tests after implementation** — run `pnpm test:api` after backend changes, `pnpm test:web` after frontend changes, or both after full-stack changes. Fix any failures before considering the task done.

## UI Testability

All interactive UI elements **must include `data-testid` attributes** so Playwright tests can locate them reliably.

**Naming convention:** `{scope}-{element}` in kebab-case, e.g. `login-email-input`, `family-delete-btn-123`.

**Rules:**
- Form inputs: pass `testId` prop to `FormField` / `PasswordField` — it lands on the raw `<input>` via `slotProps.htmlInput`
- Buttons, dialogs, table rows, list items: add `data-testid` directly as a prop
- Dynamic/repeated elements: append the unique key, e.g. `family-member-row-{userId}`
- MUI Select: put `data-testid` on the wrapping `<FormControl>`, then use `.getByRole('combobox')` inside it in tests

**When to use `data-testid` vs semantic locators in tests:**

| Scenario | Preferred locator |
|---|---|
| Unique text button ("Sign In") | `getByRole('button', { name: /sign in/i })` |
| Heading, link | `getByRole('heading', ...)`, `getByRole('link', ...)` |
| Form input (label may change or appears in multiple dialogs) | `getByTestId('login-email-input')` |
| Password input | `getByTestId('login-password-input')` |
| Icon button without visible text | `getByTestId('header-logout-btn')` |
| MUI Select | `getByTestId('family-role-select-123').getByRole('combobox')` |
| Container text check | `getByTestId('header-family-info').toContainText('ADMIN')` |

## Documentation

Each module has a PRD document in `docs/prd`. Always update PRD documents when adding or modifying use cases.
