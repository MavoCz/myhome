# Family App Starter

A full-stack modular monolith template with a Spring Boot 4 backend and React SPA frontend, designed for family-oriented applications with parent/child role-based access control.

## Prerequisites

- **Java 25** via [SDKMAN](https://sdkman.io/install/)
- **Node.js 20+** and **pnpm 9+**
- **Docker** (for PostgreSQL via Docker Compose, and JOOQ code generation)

## Quick Start

### 1. Install Java

```bash
sdk install java 25.0.2-tem
```

### 2. Install frontend dependencies

```bash
pnpm install
```

### 3. Start everything

```bash
./dev.sh
```

This starts the backend (port 8080) and frontend dev server (port 5173). PostgreSQL is auto-started via Docker Compose — no manual database setup needed. Flyway runs migrations automatically on startup.

Alternatively, start services individually:

```bash
# Backend only (auto-starts PostgreSQL via Docker Compose)
cd backend && ./gradlew bootRun

# Frontend dev server (in a separate terminal, from project root)
pnpm dev
```

For a fresh database, tear down the Docker Compose volume first:

```bash
docker compose -f backend/compose.yml down -v
```

## Project Structure

```
starter/
├── backend/          # Spring Boot 4, Java 25, Gradle (Kotlin DSL)
├── common/           # Shared API types + fetch client (no React deps)
├── web/              # React SPA (Vite, MUI, React Router, Zustand)
├── orval.config.ts   # API codegen config
└── package.json      # pnpm workspace root
```

## Development Commands

### Frontend (from project root)

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Start Vite dev server with API proxy |
| `pnpm build` | Production build → `backend/src/main/resources/static/` |
| `pnpm generate-api` | Export OpenAPI spec + regenerate TypeScript types & React Query hooks |

### Backend (from `backend/`)

| Command | Description |
|---------|-------------|
| `./gradlew bootRun` | Run the app (port 8080, auto-starts PostgreSQL via Docker Compose) |
| `./gradlew build` | Full build with tests |
| `./gradlew test` | Run all tests |
| `./gradlew test --tests "ClassName"` | Run a single test class |
| `./gradlew test --tests "ClassName.methodName"` | Run a single test method |
| `./gradlew jooqCodegen` | Generate JOOQ classes (requires Docker) |
| `./gradlew generateOpenApiDocs` | Export OpenAPI spec to `build/docs/openapi.json` |
| `./gradlew bootJar` | Build executable JAR |

## Production Build

Build the frontend and serve it from the backend:

```bash
pnpm build
cd backend
./gradlew bootRun
```

The SPA is served at **http://localhost:8080**. All client-side routes are forwarded to `index.html` via `SpaForwardingController`.

## API Documentation

With the backend running, Swagger UI is available at:

**http://localhost:8080/swagger-ui.html**

The OpenAPI spec is at `/api-docs`.

## API Code Generation

The project uses [orval](https://orval.dev) to generate TypeScript types and API hooks from the backend's OpenAPI spec. The OpenAPI spec is exported at build time via `springdoc-openapi-gradle-plugin` — no need to manually start the backend.

```bash
pnpm generate-api
```

This single command:
1. Starts the backend (with auto-managed PostgreSQL), exports the OpenAPI spec, stops the backend
2. Runs Orval to generate TypeScript code from the spec

Output:
- **`common/src/api/generated/`** — TypeScript types + fetch functions (framework-agnostic)
- **`web/src/api/generated/`** — React Query hooks

Generated files are committed so builds work without the backend running.

## Architecture Overview

### Backend

- **Spring Modulith** — modules are sub-packages under `net.voldrich.template.backend_spring`; `internal/` packages are hidden from other modules
- **JOOQ** — type-safe SQL (not an ORM); run `./gradlew jooqCodegen` after schema changes
- **Flyway** — migrations in `backend/src/main/resources/db/migration/`
- **JWT auth** — HMAC-SHA256 access tokens (15 min) + rotating refresh tokens (7 days)
- **Family model** — users belong to families with PARENT/CHILD roles and per-module access control

### Frontend

- **pnpm workspaces** — `common/` (shared) and `web/` (React SPA)
- **MUI v6** — light/dark theme with vibrant family-oriented palette
- **Zustand** — auth state with localStorage persistence
- **TanStack Query** — data fetching via orval-generated hooks
- **React Router v7** — protected/public route guards
- **Responsive** — mobile-first with MUI breakpoints (hamburger menu on mobile, full header on desktop)

### Adding a New Module

1. Add a Flyway migration in `backend/src/main/resources/db/migration/` if the module needs database tables
2. Run `./gradlew jooqCodegen` (from `backend/`) to regenerate JOOQ classes
3. Create the backend module under `net.voldrich.template.backend_spring.<module_name>` — implement repositories, services, controllers, DTOs
4. Run `pnpm generate-api` (from project root) to export the OpenAPI spec and generate TypeScript types + hooks
5. Add frontend pages under `web/src/modules/<module_name>/`
6. Register the module in `web/src/modules/registry.ts` for the dashboard tile
7. Add routes in `web/src/router.tsx`
8. Document the module in `backend/docs/<module_name>-prd.md`
