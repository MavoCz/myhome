# Navigation — Product Requirements Document

## 1. Overview

The application uses a two-layer navigation system: a **primary nav** for switching between modules and a **module tabs** strip for navigating within a module's sub-pages. Primary navigation adapts between desktop (inline AppBar buttons) and mobile (fixed bottom nav bar). The old hamburger-drawer pattern is retired.

## 2. Goals

- Make all modules discoverable without opening a menu
- Minimize taps to reach any module or sub-page
- Provide clear active-state indicators on both navigation layers
- Respect role-based visibility (CHILD users don't see admin-only tabs)
- Support iOS safe area insets on mobile

## 3. Navigation Architecture

```
┌─────────────────────────────────────────┐
│  Header (AppBar)                        │  ← Primary nav (desktop), overflow menu (mobile)
├─────────────────────────────────────────┤
│  ModuleTabs                             │  ← Sub-page tabs (only when a module with menuItems is active)
├─────────────────────────────────────────┤
│                                         │
│  Page content                           │
│                                         │
├─────────────────────────────────────────┤
│  BottomNav                              │  ← Primary nav (mobile only)
└─────────────────────────────────────────┘
```

## 4. Components

### 4.1 Header (`web/src/components/layout/Header.tsx`)

**Desktop (md+):**
- AppBar with "Family App" title (clickable → `/home`)
- Inline nav buttons: Home + one per registered module, with active color indicator based on current path
- Right side: user info chip (displayName + role), NotificationBell, theme toggle, logout button

**Mobile (below md):**
- AppBar with "Family App" title (clickable → `/home`)
- Right side: NotificationBell + overflow menu button (MoreVert icon)
- Overflow menu (MUI `Menu`): disabled user info item, divider, theme toggle, logout
- No drawer — primary navigation is handled by BottomNav

### 4.2 BottomNav (`web/src/components/layout/BottomNav.tsx`)

- MUI `BottomNavigation` fixed to bottom of viewport
- Hidden on desktop (`display: { xs: 'block', md: 'none' }`)
- Items: Home + one action per registered module (from `modules` array)
- Active state derived from `useLocation().pathname` via `startsWith(module.path)`
- Bottom padding for iOS safe area (`pb: 'env(safe-area-inset-bottom)'`)

### 4.3 ModuleTabs (`web/src/components/layout/ModuleTabs.tsx`)

- Renders nothing when no active module or module has no `menuItems`
- Tab list: module root page (label = `mainTabLabel ?? name`) + role-filtered `menuItems`
- MUI `Tabs` with `variant="scrollable"` and `scrollButtons="auto"`
- Active tab matched by exact `location.pathname`
- Role filtering: tabs with a `roles` array are only shown if the user's `familyRole` is in that array

### 4.4 AppShell (`web/src/components/layout/AppShell.tsx`)

Composes the layout:
```
Header
ModuleTabs          ← self-hides when not applicable
Container (content) ← pb: { xs: 10, md: 3 } for bottom nav clearance on mobile
BottomNav           ← mobile only
```

## 5. Module Registration

### 5.1 ModuleDefinition

```typescript
interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  path: string;
  color: string;
  mainTabLabel?: string;       // Label for root page tab (defaults to module name)
  menuItems?: ModuleMenuItem[];
}

interface ModuleMenuItem {
  label: string;
  path: string;
  icon?: ReactNode;
  roles?: string[];  // Role-based visibility filter
}
```

### 5.2 Rules for Adding Modules

1. Create a module definition file at `web/src/modules/<name>/index.tsx`
2. Export a `ModuleDefinition` constant
3. Register it in `App.tsx` by pushing to the `modules` array
4. The module automatically appears in: bottom nav (mobile), header inline nav (desktop), and home page tiles
5. If the module has sub-pages, add them as `menuItems` — they will render as tabs automatically
6. Set `mainTabLabel` if the module root page needs a label different from the module name (e.g., "List" instead of "Expenses")

### 5.3 Currently Registered Modules

| Module | Path | mainTabLabel | Sub-pages |
|--------|------|-------------|-----------|
| Family | `/family` | — | None |
| Expenses | `/expenses` | "List" | Monthly Summary, Manage Groups (PARENT only) |

## 6. Responsive Behavior

| Breakpoint | Primary Nav | Module Tabs | Content Padding |
|-----------|-------------|-------------|-----------------|
| Mobile (<900px) | BottomNav (fixed bottom) | Scrollable tabs | `pb: 10` (bottom nav clearance) |
| Desktop (≥900px) | Header inline buttons | Scrollable tabs | `pb: 3` |

## 7. Data-testid Conventions

| Element | testid |
|---------|--------|
| Bottom nav container | `bottom-nav` |
| Bottom nav Home | `bottom-nav-home` |
| Bottom nav module | `bottom-nav-{moduleId}` |
| Module tabs container | `module-tabs` |
| Module tab | `module-tab-{slug}` (slug = lowercase, spaces → hyphens) |
| Header Home button (desktop) | `header-home-btn` |
| Header module nav (desktop) | `header-nav-{moduleId}` |
| Header user chip (desktop) | `header-user-chip` |
| Header theme toggle (desktop) | `header-theme-toggle-btn` |
| Header logout (desktop) | `header-logout-btn` |
| Header overflow button (mobile) | `header-overflow-btn` |
| Overflow theme toggle | `header-overflow-theme-btn` |
| Overflow logout | `header-overflow-logout-btn` |

## 8. Design Rules

1. **No drawers for navigation.** All navigation is via bottom nav (mobile) or inline header buttons (desktop). Drawers may still be used for non-navigation panels (e.g., filters, detail views).
2. **Modules are the unit of navigation.** Every top-level route group must be a registered module to appear in navigation. Standalone pages (like Home) are handled separately.
3. **Sub-pages are tabs, not nav items.** Module sub-pages appear as a tab strip below the header, not in the primary nav. This keeps the primary nav compact.
4. **Role filtering happens in ModuleTabs.** Individual tabs respect `menuItems[].roles`. The module itself always appears in primary nav — hiding entire modules should be done at the route guard level.
5. **Active state uses `startsWith`.** Primary nav highlights a module when the path starts with `module.path`. Tab active state uses exact path match.
6. **Bottom nav clearance.** Any page rendered inside AppShell must have bottom padding on mobile to prevent content from being hidden behind the fixed bottom nav. This is handled by AppShell's Container — do not add extra padding in individual pages.
