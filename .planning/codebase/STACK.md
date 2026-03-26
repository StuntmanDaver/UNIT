# Technology Stack

> Generated: 2026-03-25 | Focus: tech

## Overview

UNIT is a React 18 single-page application built with Vite, styled with Tailwind CSS and shadcn/ui (Radix UI primitives), backed by Supabase for database, auth, and file storage. Server state is managed through TanStack React Query. The project recently migrated from Base44 BaaS to Supabase; no Base44 references remain in source code.

## Languages

**Primary:**
- JavaScript (ES2022) - All application code
- JSX - React component syntax

**Secondary:**
- TypeScript 5.8.2 - Type checking only (not compilation); one utility file `src/utils/index.ts`
- SQL - Database schema and migrations in `supabase/migrations/`

**Type Checking:**
- `jsconfig.json` with `checkJs: true` provides lightweight type checking
- Scope limited to `src/components/**/*.js`, `src/pages/**/*.jsx`, `src/Layout.jsx`
- Excludes: `node_modules`, `dist`, `src/components/ui`, `src/api`, `src/lib`

## Runtime

**Environment:**
- Node.js (version not pinned; no `.nvmrc` or `engines` field)
- Browser target: ES2022 (configured in ESLint `parserOptions.ecmaVersion`)
- Module system: ESM (`"type": "module"` in `package.json`)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- React 18.2.0 - UI framework (`src/main.jsx` entry point)
- React DOM 18.2.0 - DOM rendering
- React Router DOM 6.26.0 - Client-side SPA routing
- Supabase JS 2.100.0 - Backend client (auth, database, storage)

**State Management:**
- TanStack React Query 5.84.1 - Server state, caching, mutations
  - Config: `src/lib/query-client.js` (refetchOnWindowFocus: false, retry: 1)
- React Context API - Auth state via `src/lib/AuthContext.jsx`

**Forms:**
- React Hook Form 7.54.2 - Form state management
- @hookform/resolvers 4.1.2 - Validation bridge
- Zod 3.24.2 - Schema validation

**Build/Dev:**
- Vite 6.1.0 - Build tool and dev server (`vite.config.js`)
- @vitejs/plugin-react 4.3.4 - React Fast Refresh and JSX transform
- TypeScript 5.8.2 - Type checking (devDependency, not compilation)

**CSS/Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS (`tailwind.config.js`)
- PostCSS 8.5.3 - CSS processing pipeline (`postcss.config.js`)
- Autoprefixer 10.4.20 - Browser vendor prefixes
- tailwindcss-animate 1.0.7 - Animation utilities (Tailwind plugin)

## UI Component Library

**Pattern: shadcn/ui (Radix + Tailwind)**

49 UI component files in `src/components/ui/`:

- Built on Radix UI primitives (20+ packages)
- Styled with Tailwind CSS and CSS variables
- Class composition via `class-variance-authority` 0.7.1 (CVA)
- Class merging via `clsx` 2.1.1 + `tailwind-merge` 3.0.2
- `cn()` utility in `src/utils/index.ts` combines clsx + tailwind-merge

**Radix UI Packages (all @radix-ui/react-*):**
accordion, alert-dialog, aspect-ratio, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip

**Additional UI Libraries:**
- Vaul 1.1.2 - Drawer/bottom sheet component (`src/components/ui/drawer.jsx`)
- cmdk 1.0.0 - Command palette (`src/components/ui/command.jsx`)
- Embla Carousel React 8.5.2 - Carousel (`src/components/ui/carousel.jsx`)
- input-otp 1.4.2 - OTP input (`src/components/ui/input-otp.jsx`)
- React Day Picker 8.10.1 - Calendar picker (`src/components/ui/calendar.jsx`)
- react-resizable-panels 2.1.7 - Resizable panels (`src/components/ui/resizable.jsx`)

## Key Dependencies

**Critical (actively used):**
- `@supabase/supabase-js` 2.100.0 - All backend communication (auth, database, storage)
- `@tanstack/react-query` 5.84.1 - Data fetching and caching for every page
- `react-router-dom` 6.26.0 - All navigation and routing
- `framer-motion` 11.16.4 - Animations (used in 21+ files across pages and components)
- `lucide-react` 0.475.0 - Icon library (used throughout)
- `recharts` 2.15.4 - Financial charts (`src/pages/Accounting.jsx`, `src/components/accounting/FinancialReports.jsx`, `src/pages/LandlordDashboard.jsx`)
- `qrcode` 1.5.4 - QR code generation (`src/components/QRCodeCard.jsx`, `src/components/BusinessQRCode.jsx`)
- `date-fns` 3.6.0 - Date formatting and manipulation
- `sonner` 2.0.1 + `react-hot-toast` 2.6.0 - Toast notifications (dual systems coexist)

**Infrastructure:**
- `next-themes` 0.4.4 - Dark mode / theme switching
- `@hello-pangea/dnd` 17.0.0 - Drag and drop

**Installed but NOT imported in source (potential dead dependencies):**
- `@stripe/react-stripe-js` 3.0.0 - No Stripe imports found in `src/`
- `@stripe/stripe-js` 5.2.0 - No Stripe imports found in `src/`
- `three` 0.171.0 - No Three.js imports found in `src/`
- `react-leaflet` 4.2.1 - No Leaflet imports found in `src/`
- `html2canvas` 1.4.1 - No imports found in `src/`
- `jspdf` 4.0.0 - No imports found in `src/`
- `react-quill` 2.0.0 - No imports found in `src/`
- `react-markdown` 9.0.1 - No imports found in `src/`
- `canvas-confetti` 1.9.4 - No imports found in `src/`
- `moment` 2.30.1 - No imports found (date-fns is used instead)
- `lodash` 4.17.21 - No imports found in `src/`

## Configuration

**Environment:**
- Variables loaded via `import.meta.env` (Vite pattern)
- `.env.example` present with template values
- `.env.local` present (contains actual secrets -- DO NOT read)
- Required env vars:
  - `VITE_SUPABASE_URL` - Supabase project URL
  - `VITE_SUPABASE_ANON_KEY` - Supabase anonymous API key

**Build:**
- Entry point: `src/main.jsx`
- Output: Standard Vite `dist/` folder
- Configuration files:
  - `vite.config.js` - Vite config (React plugin, `@` path alias)
  - `tailwind.config.js` - Tailwind with brand colors, CSS variable design tokens, shadcn/ui theme
  - `postcss.config.js` - PostCSS pipeline (Tailwind + Autoprefixer)
  - `jsconfig.json` - Path aliases and type checking config
  - `eslint.config.js` - ESLint 9 flat config

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in both `jsconfig.json` and `vite.config.js`)

**Routing:**
- `src/pages.config.js` - Auto-generated page registry (DO NOT manually edit PAGES object)
- Only `mainPage` value is editable (set to `"Welcome"`)
- 12 pages registered: Accounting, BrowseProperties, Community, Directory, LandlordDashboard, LandlordLogin, LandlordRequests, MyCard, Profile, Recommendations, Register, Welcome

## CSS / Design System

**Theme Architecture:**
- CSS custom properties defined in `src/index.css` (HSL format)
- Light and dark mode variants (`.dark` class via `next-themes`)
- Brand colors available as both CSS variables and direct Tailwind classes

**Brand Colors (Tailwind `brand-*` classes, defined in `tailwind.config.js`):**
- `brand-navy`: #101B29
- `brand-navy-light`: #1a2d42
- `brand-blue`: #1D263A
- `brand-slate`: #465A75
- `brand-slate-light`: #5a7090
- `brand-steel`: #7C8DA7
- `brand-gray`: #E0E1DE

**Semantic Color System (centralized in `src/lib/colors.js`):**
- `BRAND` - Hex values for canvas/chart contexts (non-Tailwind)
- `STATUS_COLORS` - submitted, in_progress, resolved, closed (Tailwind classes)
- `PRIORITY_COLORS` - low, medium, high (Tailwind classes)
- `FINANCIAL_COLORS` - revenue, expense, forecast, liability, profit, loss
- `CHART_COLORS` - Hex values for Recharts fill/stroke
- `CATEGORY_COLORS` - Business category badge colors (Tailwind classes)
- `CATEGORY_GRADIENTS` - Business category gradient classes (for FloorMapView)

**Design Token CSS Variables (in `src/index.css`):**
background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1 through chart-5, sidebar-* (7 sidebar tokens)

## Linting

**ESLint 9.19.0 (Flat Config):**
- Config: `eslint.config.js`
- Scope: `src/components/**/*.{js,jsx}`, `src/pages/**/*.{js,jsx}`, `src/Layout.jsx`
- Ignores: `src/lib/**/*`, `src/components/ui/**/*`

**Plugins:**
- `eslint-plugin-react` 7.37.4 - React rules
- `eslint-plugin-react-hooks` 5.0.0 - Hooks rules
- `eslint-plugin-unused-imports` 4.3.0 - Dead import removal
- `eslint-plugin-react-refresh` 0.4.18 - Vite HMR (installed, not configured in rules)

**Key Rules:**
- `unused-imports/no-unused-imports`: error (enforces clean imports)
- `unused-imports/no-unused-vars`: warn (underscore-prefixed params allowed)
- `react-hooks/rules-of-hooks`: error
- `react/prop-types`: off (no prop-types enforcement)
- `react/react-in-jsx-scope`: off (React 17+ JSX transform)
- `react/no-unknown-property`: error (ignores `cmdk-input-wrapper`, `toast-close`)

## NPM Scripts

```bash
npm run dev           # Start Vite dev server
npm run build         # Production build (vite build)
npm run lint          # ESLint check (--quiet, no warnings)
npm run lint:fix      # ESLint auto-fix
npm run typecheck     # TypeScript type checking (tsc -p ./jsconfig.json)
npm run preview       # Preview production build (vite preview)
```

## Platform Requirements

**Development:**
- Node.js (any recent LTS; no version pinned)
- npm
- Supabase project with URL and anon key
- `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

**Production:**
- Static hosting capable of serving an SPA (Vite `dist/` output)
- Supabase project (database, auth, storage bucket `public-assets`)

## Key Findings

- **11+ potentially unused dependencies** in `package.json` (Stripe, Three.js, Leaflet, html2canvas, jsPDF, react-quill, react-markdown, canvas-confetti, moment, lodash) -- no imports found in source code; audit and remove to reduce bundle size
- **Dual toast notification systems**: both `sonner` and `react-hot-toast` are installed and coexist; consolidate to one
- **Dual date libraries**: both `date-fns` and `moment` are listed, but only `date-fns` appears to be imported
- **No test framework** installed -- no jest, vitest, or testing-library packages in devDependencies
- **Base44 fully removed** from source code -- zero imports or references in `src/`. The `src/api/` directory has been deleted. The `src/lib/app-params.js` file has been deleted.
- **Stripe packages installed but unused** -- may indicate a planned payment feature not yet implemented
- **No CI/CD pipeline** detected in the repository

---

*Stack analysis: 2026-03-25*
