# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Spring Boot 4.0.2 backend template using Java 25, Gradle 9.3.0 (Kotlin DSL), and Spring Modulith for modular monolith architecture.

**Base package:** `net.voldrich.myhome.backend`

## Build & Development Commands

```bash
./gradlew build              # Full build with tests
./gradlew bootRun            # Run app (auto-starts PostgreSQL via Docker Compose)
./gradlew test               # Run all tests
./gradlew test --tests "ClassName"           # Run a single test class
./gradlew test --tests "ClassName.methodName" # Run a single test method
./gradlew jooqCodegen        # Generate JOOQ classes (requires Docker)
./gradlew generateOpenApiDocs # Export OpenAPI spec to build/docs/openapi.json
./gradlew bootJar            # Build executable JAR
./gradlew bootBuildImage     # Build OCI container image
./gradlew clean build        # Clean rebuild
```

PostgreSQL is auto-managed by Spring Boot Docker Compose support (`compose.yml`). No manual Docker commands needed for development. For a fresh database: `docker compose down -v` then restart.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Web | Spring MVC (REST) |
| Security | Spring Security |
| Database access | JOOQ (type-safe SQL) + Spring JDBC |
| Migrations | Flyway (`src/main/resources/db/migration/`) |
| Modularity | Spring Modulith (enforced module boundaries) |
| Monitoring | Spring Boot Actuator + Micrometer |
| Testing | JUnit 5 + Spring Boot Test |

## Architecture

This is a **Spring Modulith** project. Business logic should be organized into separate modules as sub-packages under the base package. Spring Modulith enforces module boundaries at runtime — each module's internal types are not accessible from other modules unless explicitly exposed.

**Module structure pattern:**
```
net.voldrich.myhome.backend/
├── <module_name>/          # Each module is a direct sub-package
│   ├── *Service.java       # Exposed API (accessible to other modules)
│   └── internal/           # Module internals (hidden from other modules)
```

## Database

- Flyway migrations go in `src/main/resources/db/migration/`
- Naming convention: `V{version}__{description}.sql` (e.g., `V1__Create_users_table.sql`)
- Database connection is auto-configured from Docker Compose in development; override via environment variables in non-dev environments
- JOOQ is the primary query layer (type-safe SQL builder, not an ORM)
- JOOQ code generation: `./gradlew jooqCodegen` — spins up a PostgreSQL Testcontainer, runs Flyway migrations, and generates type-safe table/record classes from the schema into `build/generated-sources/jooq` (package `net.voldrich.myhome.backend.jooq`). Flyway tables are excluded. Requires Docker to be running. The custom database class is in `buildSrc/src/main/java/net/voldrich/template/jooq/FlywayTestcontainersDatabase.java`.

## Documentation

Always update PRD documents in /docs folder describing new usecases. Each module has its own PRD file.
