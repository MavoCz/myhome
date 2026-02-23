# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Spring Boot 4.0.2 backend template using Java 25, Gradle 9.3.0 (Kotlin DSL), and Spring Modulith for modular monolith architecture. The project lives in the `backend/` directory.

**Base package:** `net.voldrich.template.backend_spring`

## Prerequisites

- **Java 25** via SDKMAN: `sdk install java 25.0.2-tem`
- **Docker** (required for PostgreSQL and JOOQ code generation)
- **PostgreSQL 17** on port 5433:
  ```bash
  docker run -d --name postgres_backend -e POSTGRES_USER=root -e POSTGRES_PASSWORD=root -e POSTGRES_DB=backend -p 5433:5432 postgres:17
  ```

## Build & Development Commands

All Gradle commands run from `backend/`:

```bash
./gradlew build              # Full build with tests
./gradlew bootRun            # Run app (port 8080, DevTools live reload)
./gradlew test               # Run all tests
./gradlew test --tests "ClassName"           # Single test class
./gradlew test --tests "ClassName.methodName" # Single test method
./gradlew jooqCodegen        # Generate JOOQ classes (requires Docker)
./gradlew bootJar            # Build executable JAR
./gradlew bootBuildImage     # Build OCI container image
```

## Architecture

### Spring Modulith (Modular Monolith)

Modules are direct sub-packages under the base package. Spring Modulith enforces boundaries — only types at the module root are public API; anything in `internal/` is hidden from other modules.

```
net.voldrich.template.backend_spring/
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
pnpm generate-api            # Run orval to regenerate API types + hooks (requires backend running)
```

### Frontend Architecture

- **API codegen:** Orval generates fetch functions into `common/` and React Query hooks into `web/` from the backend's OpenAPI spec
- **Auth:** Zustand store with localStorage persistence, custom fetch client with automatic JWT refresh
- **Theming:** MUI v6 with light/dark mode toggle, vibrant family-oriented palette
- **Modules:** Frontend modules mirror backend Spring Modulith modules in `web/src/modules/`
- **Routing:** React Router v7 with protected/public route guards
- **SPA serving:** `SpaForwardingController` forwards non-file routes to `index.html`

## Documentation

Each module has a PRD document in `backend/docs/`. Always update PRD documents when adding or modifying use cases.
