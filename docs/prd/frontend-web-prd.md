# Frontend Web Application — Product Requirements Document

## 1. Overview

The frontend is a React + TypeScript single-page application (SPA) that provides the user interface for the family-oriented modular backend. It is served from the backend's `static/` directory for same-origin deployment, with a Vite dev server proxying API calls during development. A `common/` package separates shared API types and the fetch client for future React Native reuse.

## 2. Goals

- Provide registration, login, and a main dashboard for the family application
- Generate API types and hooks from the backend's OpenAPI spec via orval
- Support light and dark themes with a vibrant, family-friendly palette
- Be fully responsive across mobile, tablet, and desktop
- Mirror the backend's Spring Modulith module structure in frontend code organization
- Share API client and types between web and future mobile apps via a `common/` package

## 3. Tech Stack

| Layer | Technology |
|-------|-----------|
| Build | Vite 6, pnpm workspaces |
| UI Framework | React 19 |
| Component Library | MUI v6 (Material UI) with Emotion |
| Routing | React Router v7 |
| State Management | Zustand (auth), React Context (theme) |
| Data Fetching | TanStack Query v5 (via orval-generated hooks) |
| API Codegen | Orval (OpenAPI → fetch functions + React Query hooks) |
| Language | TypeScript (strict mode) |

## 4. Project Structure

```
starter/
├── common/                            # Shared types + fetch client (no React deps)
│   └── src/api/
│       ├── generated/                 # Orval output (types + fetch functions)
│       ├── client.ts                  # Custom fetch with JWT auth + refresh
│       ├── auth.ts                    # TokenStorage interface + localStorage impl
│       └── index.ts
├── web/                               # React SPA (Vite)
│   └── src/
│       ├── main.tsx                   # Entry point
│       ├── App.tsx                    # Provider composition
│       ├── router.tsx                 # Route definitions
│       ├── api/generated/             # Orval output (React Query hooks)
│       ├── theme/                     # Light/dark palette, theme, ThemeProvider
│       ├── stores/authStore.ts        # Zustand auth state
│       ├── hooks/useAuth.ts           # Auth convenience hook
│       ├── components/
│       │   ├── layout/                # AppShell, Header (responsive)
│       │   ├── forms/                 # FormField, PasswordField
│       │   └── common/                # ProtectedRoute, PublicRoute, ModuleTile, LoadingSpinner
│       ├── modules/
│       │   ├── registry.ts            # Module definitions for dashboard tiles
│       │   └── auth/pages/            # LoginPage, RegisterPage
│       └── pages/HomePage.tsx         # Dashboard with module grid
├── orval.config.ts                    # Generates into common/ and web/
├── package.json                       # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 5. Use Cases

### 5.1 Registration

**Actor:** Unauthenticated user

**Flow:**
1. User navigates to `/register`
2. Fills in display name, family name, email, and password
3. Client validates: all fields required, valid email format, password ≥ 8 characters
4. On submit, calls `POST /api/auth/register`
5. On success, stores tokens and user info in auth store, navigates to `/home`
6. On error, displays error message in an alert

### 5.2 Login

**Actor:** Unauthenticated user

**Flow:**
1. User navigates to `/login`
2. Fills in email and password
3. Client validates: all fields required
4. On submit, calls `POST /api/auth/login`
5. On success, stores tokens and user info in auth store, navigates to `/home`
6. On error, displays error message in an alert

### 5.3 Token Refresh

**Actor:** Authenticated user (automatic)

**Flow:**
1. API call returns 401 (access token expired)
2. Custom fetch client intercepts, calls `POST /api/auth/refresh` with refresh token
3. On success, updates stored tokens, retries original request
4. On failure, clears auth state, redirects to `/login`
5. Concurrent requests during refresh are coalesced (single refresh call)

### 5.4 Logout

**Actor:** Authenticated user

**Flow:**
1. User clicks logout button (desktop: header bar, mobile: overflow menu)
2. Auth store is cleared (tokens + user)
3. User is redirected to `/login`

### 5.5 Dashboard

**Actor:** Authenticated user

**Flow:**
1. User is on `/home`
2. Sees a greeting with their display name
3. Sees a responsive grid of module tiles (if any modules are registered)
4. If no modules are registered, sees a friendly empty state with a family icon
5. Clicking a module tile navigates to that module's route

### 5.6 Theme Toggle

**Actor:** Any user

**Flow:**
1. User clicks the sun/moon icon in the header
2. Theme switches between light and dark mode
3. Preference is persisted to `localStorage`
4. On first visit, defaults to the system's `prefers-color-scheme`

## 6. Routing

| Path | Guard | Component |
|------|-------|-----------|
| `/login` | PublicRoute (redirects to `/home` if authenticated) | LoginPage |
| `/register` | PublicRoute | RegisterPage |
| `/home` | ProtectedRoute (redirects to `/login` if unauthenticated) | AppShell → HomePage |
| `/` | ProtectedRoute | Redirects to `/home` |
| `*` | None | Redirects to `/home` |

## 7. Responsive Design

| Breakpoint | Primary Nav | Header | Auth Forms | Module Grid |
|-----------|-------------|--------|------------|-------------|
| Mobile (<900px) | Bottom nav bar | Title + notification + overflow menu | Full-width card | 1 column |
| Desktop (≥900px) | Header inline buttons | Full bar with nav, user chip, theme toggle, logout | Constrained card | 3 columns |

- All interactive elements have a minimum touch target of 44px (WCAG compliance)
- Content is constrained with `Container maxWidth="lg"` on desktop
- Viewport meta tag ensures proper mobile scaling
- See [Navigation PRD](navigation-prd.md) for full navigation design details

## 8. Theme

### Light Mode
- Primary: Warm orange (`#FF6B35`)
- Secondary: Purple (`#7B2D8E`)
- Background: Warm off-white (`#FFF8F0`)

### Dark Mode
- Primary: Adjusted orange (`#FF8A5C`)
- Secondary: Brighter purple (`#A855F7`)
- Background: Deep navy (`#1A1A2E`)

### Shared
- Border radius: 12px (cards: 16px)
- Friendly font stack: Inter, Segoe UI, Roboto, Helvetica Neue, Arial
- Bold headings (h4: 700, h5/h6: 600)
- Buttons: no text transform, 600 weight

## 9. API Client Architecture

The custom fetch client in `common/src/api/client.ts`:
1. Attaches `Authorization: Bearer <token>` header to all requests
2. Sets `Content-Type: application/json` when a body is present
3. On 401: attempts token refresh, retries the original request on success
4. On refresh failure: clears tokens, calls `onAuthFailure` callback
5. Coalesces concurrent refresh attempts (single in-flight refresh)
6. Parses error responses and throws structured error objects

The `TokenStorage` interface allows platform-specific implementations:
- Web: reads/writes from Zustand store (persisted to `localStorage`)
- Future mobile: can use secure keychain storage

## 10. Module System

New backend modules are exposed on the dashboard and navigation by adding entries to `web/src/modules/registry.ts`:

```typescript
export interface ModuleDefinition {
  id: string;            // unique identifier
  name: string;          // display name
  description: string;   // short description for tile
  icon: ReactNode;       // MUI icon component
  path: string;          // route path
  color: string;         // accent color for tile
  mainTabLabel?: string; // label for root page tab (defaults to name)
  menuItems?: ModuleMenuItem[]; // sub-page tabs
}
```

Registered modules automatically appear in the bottom nav (mobile), header inline nav (desktop), and home page tiles. Sub-pages defined in `menuItems` render as a tab strip below the header. See [Navigation PRD](navigation-prd.md) for full details.

Each module's frontend code lives in `web/src/modules/<module-name>/` following the same pattern as `auth/`.

## 11. Backend Integration

| File | Change |
|------|--------|
| `SecurityConfig.java` | Added `.requestMatchers` for `/`, `/index.html`, `/assets/**`, `/favicon.ico` |
| `SpaForwardingController.java` (new) | Forwards non-file routes to `index.html` for client-side routing |

## 12. Build & Development

```bash
pnpm install          # Install all dependencies
pnpm dev              # Vite dev server on :5173 (proxies /api → :8080)
pnpm build            # Production build → backend/src/main/resources/static/
pnpm generate-api     # Regenerate API types + hooks from OpenAPI spec
```

Production build outputs chunked assets (vendor, MUI, app) for optimal caching.
