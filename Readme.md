# Family App Starter

A full-stack modular monolith template with a Spring Boot 4 backend and React SPA frontend, designed for family-oriented applications with parent/child role-based access control.

## Prerequisites

- **Java 25** via [SDKMAN](https://sdkman.io/install/)
- **Node.js 20+** and **pnpm 9+**
- **Docker** (for PostgreSQL and JOOQ code generation)

## Quick Start

### 1. Install Java

```bash
sdk install java 25.0.2-tem
```

### 2. Start PostgreSQL

```bash
docker run -d --name postgres_backend \
  -e POSTGRES_USER=root \
  -e POSTGRES_PASSWORD=root \
  -e POSTGRES_DB=backend \
  -p 5433:5432 \
  postgres:17
```

### 3. Install frontend dependencies

```bash
pnpm install
```

### 4. Start the backend

```bash
cd backend
./gradlew bootRun
```

The backend runs on **http://localhost:8080**. Flyway runs migrations automatically on startup.

### 5. Start the frontend dev server

In a separate terminal from the project root:

```bash
pnpm dev
```

The Vite dev server runs on **http://localhost:5173** and proxies `/api` requests to the backend.

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
| `pnpm generate-api` | Regenerate API types + React Query hooks from OpenAPI spec (backend must be running) |

### Backend (from `backend/`)

| Command | Description |
|---------|-------------|
| `./gradlew bootRun` | Run the app (port 8080, DevTools live reload) |
| `./gradlew build` | Full build with tests |
| `./gradlew test` | Run all tests |
| `./gradlew test --tests "ClassName"` | Run a single test class |
| `./gradlew test --tests "ClassName.methodName"` | Run a single test method |
| `./gradlew jooqCodegen` | Generate JOOQ classes (requires Docker) |
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

The project uses [orval](https://orval.dev) to generate TypeScript types and API hooks from the backend's OpenAPI spec:

```bash
# Start the backend first, then:
pnpm generate-api
```

This generates:
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

1. Create the backend module under `net.voldrich.template.backend_spring.<module_name>`
2. Add a Flyway migration if needed
3. Regenerate API types: `pnpm generate-api`
4. Add frontend pages under `web/src/modules/<module_name>/`
5. Register the module in `web/src/modules/registry.ts` for the dashboard tile
6. Add routes in `web/src/router.tsx`
7. Document the module in `backend/docs/<module_name>-prd.md`
