<!-- GSD:project-start source:PROJECT.md -->
## Project

**UNIT**

UNIT is a multi-tenant property community mobile application built with Expo and React Native. It connects business tenants within commercial properties, enabling them to discover neighboring businesses, publish community updates, submit operational requests, and share digital business profiles. The app also provides admin workflows for tenant request management and property operations. Targets iOS and Android via a single TypeScript codebase.

**Core Value:** Every tenant business in a property has a discoverable digital presence, and the property can coordinate communication and operations in one shared application.

### Constraints

- **Tech stack**: Expo SDK 54 + React Native, Supabase for BaaS (PostgreSQL, Auth, Edge Functions) -- no custom backend needed
- **Existing code**: Rebuilt from web SPA -- now a native mobile app with file-based routing
- **Publishing**: Built with EAS Build; distributed via App Store (iOS) and Google Play (Android)
- **Brand**: Established brand identity (navy-to-steel-blue gradient, "Where Tenants Connect") must be maintained
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9 (strict mode) -- all application code
- TSX -- React Native component syntax
- SQL -- Database schema and migrations in `supabase/migrations/`
- TypeScript (Deno) -- Supabase Edge Functions in `supabase/functions/`
## Runtime
- React Native 0.81 via Expo SDK 54
- Metro bundler (development and production builds)
- Node.js (build tooling, scripts)
- npm (lockfile: `package-lock.json`)
## Frameworks & Libraries
- Expo ~54.0.33 -- Managed workflow, native module integration
- Expo Router ~6.0.23 -- File-based routing (app/ directory)
- React 19.1.0 -- UI framework
- React Native 0.81.5 -- Native rendering
- NativeWind 4.2.3 -- Tailwind CSS for React Native (className prop)
- Tailwind CSS 3.4.19 -- Utility-first styling (compiled via NativeWind)
- React Hook Form 7.72.1 -- Form state management
- @hookform/resolvers 5.2.2 -- Validation resolvers
- Zod 4.3.6 -- Schema validation
- TanStack React Query 5.96.2 -- Server state management and caching
- Supabase JS 2.101.1 -- Backend client (auth, database, storage, Edge Functions)
- @react-native-async-storage/async-storage 3.0.2 -- Persistent storage adapter for Supabase auth
- lucide-react-native 1.7.0 -- Icon library
- react-native-safe-area-context 5.6.0 -- Safe area insets
- react-native-svg 15.15.4 -- SVG rendering (required by lucide)
- expo-linear-gradient 15.0.8 -- Gradient backgrounds
- expo-image-picker 17.0.10 -- Photo library and camera access
- expo-splash-screen 31.0.13 -- Splash screen control
- expo-status-bar 3.0.9 -- Status bar styling
- react-native-toast-message 2.3.3 -- Toast notifications
- date-fns 4.1.0 -- Date manipulation and formatting
## Dev Dependencies
- TypeScript ~5.9.2 -- Type checking
- @types/react ~19.1.0 -- React type definitions
- Jest 30.3.0 -- Test runner
- @testing-library/react-native 13.3.3 -- Component testing
## Configuration Files
- `app.json` -- Expo app config (name, slug, icons, splash, permissions, plugins)
- `eas.json` -- EAS Build profiles (development, preview, production)
- `babel.config.js` -- Babel presets (expo + nativewind)
- `metro.config.js` -- Metro bundler config with NativeWind integration
- `tailwind.config.js` -- Tailwind theme (brand colors, NativeWind preset)
- `tsconfig.json` -- TypeScript strict mode, `@/*` path alias
- `global.css` -- Tailwind CSS directives
## Environment
- Supabase env vars loaded at build time (configured in Expo constants or .env)
- Required: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Entry point: `expo-router/entry` (configured in package.json `main`)
- `@/*` maps to project root (configured in `tsconfig.json`)
## Platform Requirements
- Node.js 18+
- npm
- Expo CLI (`npx expo`)
- EAS CLI for builds (`eas build`)
- iOS Simulator or Android Emulator for local development
- Supabase project (database, auth, storage bucket `public-assets`, Edge Functions)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## File Extensions
- All application code uses `.tsx` (components, screens, layouts) and `.ts` (services, hooks, constants, utilities)
- No `.jsx` or `.js` files in application code (config files like `babel.config.js` are exceptions)
## Naming Patterns
- **Components:** PascalCase files in `components/ui/` (e.g., `Button.tsx`, `GradientHeader.tsx`, `Input.tsx`, `LoadingScreen.tsx`)
- **Services:** camelCase files in `services/` (e.g., `businesses.ts`, `posts.ts`, `profiles.ts`, `supabase.ts`)
- **Hooks:** camelCase with `use` prefix in `hooks/` (e.g., `useCurrentUser.ts`)
- **Constants:** camelCase files in `constants/` (e.g., `colors.ts`, `categories.ts`)
- **Route files:** lowercase in `app/` directory (e.g., `login.tsx`, `community.tsx`, `directory.tsx`)
- **Layouts:** `_layout.tsx` in each route group
- camelCase for functions, variables, and hook names
- PascalCase for React components and TypeScript types/interfaces
- UPPERCASE for constant values
## Import Organization
- `@/*` maps to project root (configured in `tsconfig.json` paths)
- All internal imports use the `@/` prefix: `@/services/supabase`, `@/components/ui/Button`, `@/lib/AuthContext`, `@/hooks/useCurrentUser`, `@/constants/colors`
- External imports first, then internal imports grouped by layer
## Code Style
- 2-space indentation
- TypeScript strict mode enforced
- Props typed via TypeScript interfaces (not PropTypes)
- Functional components with arrow functions or function declarations
- NativeWind `className` prop for all styling (Tailwind utilities)
## Error Handling
- Service layer: Supabase calls check for errors and throw
- React Query: `useQuery` / `useMutation` manage error states
- Auth errors: Typed in AuthContext with redirect logic
- Toast notifications for user-facing feedback via `react-native-toast-message`
## Module Design
- **Components:** Named exports (e.g., `export function Button()`)
- **Services:** Named exports with async functions
- **Hooks:** Named exports
- **Constants:** Named exports
- **Layouts:** Default exports (required by Expo Router)
- **Screens:** Default exports (required by Expo Router)
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Cross-platform mobile app with file-based routing via Expo Router
- React Query (TanStack Query) for all server state management and caching
- Thin service layer wrapping Supabase client calls (`services/`)
- React Context for auth state only (AuthProvider / useAuth)
- Property-scoped data model -- most queries filter by `property_id`
- Supabase Edge Functions for server-side operations (`supabase/functions/`)
- No `src/` directory -- all code lives at project root
## Directory Structure
```
app/                    # Expo Router file-based routes
  _layout.tsx           # Root layout (providers, AuthGuard)
  (auth)/               # Auth route group
    _layout.tsx
    login.tsx
    signup.tsx
    reset-password.tsx
    onboarding.tsx
  (tabs)/               # Main tab navigation
    _layout.tsx
    directory.tsx
    community.tsx
    promotions.tsx
    notifications.tsx
    profile.tsx
  (admin)/              # Admin route group
    _layout.tsx
    index.tsx
components/ui/          # Reusable UI components (Button, Input, GradientHeader, LoadingScreen)
services/               # Supabase service modules (businesses, posts, profiles, properties, etc.)
hooks/                  # Custom React hooks (useCurrentUser)
constants/              # App constants (colors, categories)
lib/                    # Core libraries (AuthContext, query-client)
supabase/
  migrations/           # SQL migration files
  functions/            # Deno Edge Functions (10 functions)
assets/                 # App icons, splash screen images
```
## Auth Flow
1. `app/_layout.tsx` wraps the entire app in `SafeAreaProvider > QueryClientProvider > AuthProvider`
2. `AuthGuard` component (in root layout) checks auth state on every navigation
3. Unauthenticated users are redirected to `/(auth)/login`
4. Users needing password change go to `/(auth)/reset-password`
5. Users needing onboarding go to `/(auth)/onboarding`
6. Authenticated users in auth group are redirected to `/(tabs)/directory`
## Service Layer
- Location: `services/*.ts` (11 modules)
- Modules: `supabase.ts` (client singleton), `businesses.ts`, `posts.ts`, `profiles.ts`, `properties.ts`, `notifications.ts`, `admin.ts`, `promotions.ts`, `analytics.ts`, `storage.ts`, `push.ts`
- Pattern: Exported async functions that call `supabase.from().select/insert/update/delete`
- Used by: Screen components via React Query `queryFn` / `mutationFn`
## Edge Functions
- Location: `supabase/functions/` (10 functions)
- Functions: `add-property-to-admin`, `complete-onboarding`, `invite-tenant`, `mark-escalated-requests`, `mark-overdue-invoices`, `send-escalation-email`, `send-invoice-email`, `send-push-notification`, `issue-refund`, `expire-promotions`
- Runtime: Deno (deployed to Supabase Edge)
## State Management
- **Server state:** TanStack React Query -- all API data cached and synchronized
- **Auth state:** React Context via `lib/AuthContext.tsx` -- provides `useAuth()` hook with `isAuthenticated`, `isLoading`, `needsPasswordChange`, `needsOnboarding`
- **Local state:** Component `useState` for form state, modal visibility, UI interactions
- **Mutations:** `useMutation` wraps service calls, `queryClient.invalidateQueries` on success, toast notification for feedback
## Query Client
- Location: `lib/query-client.ts`
- Global QueryClient instance with default options
## Brand Theming

### Colors (locked in `tailwind.config.js`)
- `brand-navy` (#F4F5F7) — Global light screen background, matching the Delta-inspired surface treatment.
- `brand-navy-light` (#FFFFFF) — Cards, modals, inputs, and elevated surfaces on the light background.
- `brand-blue` (#465A75) — Accent (10%, reserved): primary buttons, focused input borders, selected segments, card hairlines (`border-brand-blue/40`), `GradientHeader` endpoint
- `brand-steel` (#5F708A) — Muted support text and inactive controls. This is the light-surface-safe muted token; it passes AA for small text on `brand-mist` and `brand-cloud`.
- `brand-gray` (#101B29) — Primary text on global light surfaces.
- `white` (#FFFFFF) — Header titles and button labels on dark/blue surfaces.
- `red-500` (#EF4444) — Destructive actions only (only non-brand color permitted)
- Additional constants in `constants/colors.ts`

### Light-surface tokens (Delta-inspired, global)
Added 2026-05-02 for Home Feed and expanded globally on 2026-05-07.

- `brand-cloud` (#F4F5F7) — Light screen background. Pair major tab/admin screens with a `GradientHeader` where practical so navy still anchors the top of the screen.
- `brand-mist` (#FFFFFF) — White card surface on top of `brand-cloud`. Always pair with `text-brand-ink` / `text-brand-ink-muted` for AA contrast.
- `brand-paper` (#E5E7EB) — Card hairline border on `brand-mist` (`border border-brand-paper`).
- `brand-ink` (#101B29) — Primary text on `brand-mist` (same hex as `brand-navy`; semantic-only alias for light surfaces).
- `brand-ink-muted` (#465A75) — Secondary text on `brand-mist` (same hex as `brand-blue`; semantic-only alias).

**Light-surface usage rules:**
- The Delta-inspired light surface is now the default for all pages, not Home-only.
- Header surfaces and the bottom tab bar may stay dark navy through explicit constants/styles for contrast.
- Prefer explicit light-surface classes in React Native screens: `bg-brand-cloud`, `bg-brand-mist`, `text-brand-ink`, and `text-brand-ink-muted`.
- Prefer `GradientHeader` on top-level tab/admin pages that need a strong brand anchor.

**Delta app design references** (for future re-design or light-surface expansion work):
- `/Users/davidk/Downloads/Screenshot 2026-05-02 at 8.04.21 PM.png` — Find My Trip (light gray bg, white card, navy header)
- `/Users/davidk/Downloads/Screenshot 2026-05-02 at 8.04.40 PM.png` — Travel Information list (white card + chevron rows, navy header, light bottom nav)
- `/Users/davidk/Downloads/Screenshot 2026-05-02 at 8.04.51 PM.png` — Book screen (white card with form, red CTA)
- `/Users/davidk/Downloads/Screenshot 2026-05-02 at 8.05.10 PM.png` — Home/Explore (promotional cards on light surface)

### Fonts
The app uses **Lora** (serif, headings/display) and **Nunito** (sans-serif, body/UI). Both are loaded via `@expo-google-fonts/lora` and `@expo-google-fonts/nunito` in `app/_layout.tsx` via `useFonts()`. The Tailwind classes live in `tailwind.config.js`.

**Exactly 4 font classes are permitted on `<Text>` elements:**
- `font-nunito` (Nunito 400) — body/label/caption regular
- `font-nunito-semibold` (Nunito 600) — body emphasis, button labels, small heading
- `font-lora` (Lora 400) — rarely used; reserved for serif body if needed
- `font-lora-semibold` (Lora 600) — section headings and screen titles

**Banned on `<Text>`:** `font-bold`, `font-medium`, `font-nunito-bold`, `font-lora-bold`, any legacy Arcadia-prefixed class, bare `<Text>` with no font class. Tailwind's `font-bold`/`font-medium` would synthesize weights the loaded font files cannot provide and will render wrong on Android.

**Type scale (exactly 4 sizes):**
- `text-sm` (14px) — labels / captions → `leading-normal`
- `text-base` (16px) — body → `leading-relaxed`
- `text-2xl` (24px) — section headings → `leading-tight`, `font-lora-semibold`
- `text-3xl` (30px) — screen titles → `leading-tight`, `font-lora-semibold`

Banned sizes: `text-xs`, `text-lg`, `text-xl`, `text-4xl+`.

### Splash & app icon
- Splash background: `#F4F5F7` (`brand-cloud`)
- Splash image: `./assets/unit-logo-light.png` via the `expo-splash-screen` config plugin in `app.json` (do NOT use the legacy top-level `splash` block).
- `userInterfaceStyle` in `app.json` must be `"light"` so launch/loading screens stay in the lighter logo colorway.

### Enforcement
- Every `<Text>` MUST have one of the 4 font classes and one of the 4 size classes
- Every screen root `<View>` in `app/(tabs)/**` and `app/(admin)/**` should use `bg-brand-cloud` unless it is an intentional dark header/chrome surface.
- No raw Tailwind color classes: `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`, `bg-black` (except `bg-black/50` on Modal scrim), `text-black`
- Spacing uses the strict 4/8pt grid: `{4, 8, 16, 24, 32, 48, 64}` px. `p-3` is permitted ONLY on icon-only `Pressable` hit targets and on `Button` padding (`py-3 px-4`), justified by the 44pt Apple HIG touch-target requirement
- Touch targets: minimum 44×44pt on every interactive element; use `activeOpacity={0.7}` on `Pressable`
- Icons: `lucide-react-native` only — no emoji as icons
- Run `npm run brand-lint` (in `unit/`) after any UI change — must exit 0

*This section supersedes any earlier Arcadia-branded font directive. That font was never loaded at runtime and has been removed from the codebase.*
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

## Self-Correcting CLAUDE.md Rule

**Every time Claude gets something wrong about this project -- a wrong file path, incorrect assumption, outdated pattern, misunderstood convention -- add the correction directly to CLAUDE.md.** Do not just re-prompt or fix inline. Update this file so the correction persists across every future session, every subagent, and every teammate.

Over time, CLAUDE.md becomes a precision-tuned instruction set that makes Claude increasingly effective. This applies to all contributors: when you spot Claude making a recurring mistake, codify the fix here.

**Design references**: The Delta app screenshots in `/Users/davidk/Downloads/` (4 files starting with "Screenshot 2026-05-02 at 8.04") are the canonical visual reference for the light-surface direction (white cards on light-gray screen, navy headers). Consult these before making any further light-surface UI decisions.
