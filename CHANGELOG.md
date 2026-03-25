# Changelog

All notable changes to the UNIT project will be documented in this file.

## [Unreleased]

### Added
- **Brand Identity**: Created `docs/BRAND.md` with full brand guidelines including logo description, tagline ("Where Tenants Connect"), color palette, usage guidelines, accessibility notes, and brand voice.
- **Brand Color Palette**: Established official 5-color brand palette:
  - Dark Navy (#101B29) - primary brand color
  - Deep Blue (#1D263A) - secondary surfaces
  - Slate Blue (#465A75) - supporting elements
  - Light Steel Blue (#7C8DA7) - muted accents
  - Soft Light Gray (#E0E1DE) - backgrounds/surfaces
- **Tailwind Brand Tokens**: Added `brand-navy`, `brand-blue`, `brand-slate`, `brand-steel`, `brand-gray` plus hover variants (`brand-navy-light`, `brand-slate-light`) to `tailwind.config.js`.
- **Centralized Color Config**: Created `src/lib/colors.js` with:
  - `BRAND` hex constants for canvas/chart contexts
  - `STATUS_COLORS`, `PRIORITY_COLORS`, `FINANCIAL_COLORS` semantic token maps
  - `CHART_COLORS` for Recharts fill/stroke values
  - `CATEGORY_COLORS` and `CATEGORY_GRADIENTS` for business type visual differentiation

### Changed
- **Theme Colors**: Updated CSS custom properties in `src/index.css` to use brand palette for both light and dark modes.
- **UnitLogo.jsx**: Updated SVG gradient from indigo/purple/pink to brand palette.
- **PRD**: Updated Section 13 (UX and Design System) in `docs/PRD.md` to reference brand identity.

#### Full Brand Color Migration (~116 changes across 24 files)
- **Page backgrounds** (11 pages): Replaced `from-zinc-950 via-slate-900 to-zinc-900` with `from-brand-navy via-brand-blue to-brand-navy`. Also migrated header bars and card backgrounds.
- **Logo pill gradients** (6 files): Replaced indigo/purple/pink inline "U" logo with brand-slate/steel/gray gradient.
- **CTA buttons** (18 files): Unified all button gradients (indigo-purple AND emerald-teal) to `from-brand-slate to-brand-navy` with `hover:from-brand-slate-light hover:to-brand-navy-light`.
- **Icon boxes** (5 files): Gradient squares next to headings migrated to brand gradient.
- **Active/tab states** (4 files): `bg-indigo-500` → `bg-brand-slate` for selected tabs, filters, toggles.
- **Brand badges** (8 files): `bg-indigo-500/20 text-indigo-300` → `bg-brand-slate/20 text-brand-steel` across all badge instances.
- **Focus rings** (2 files): `focus:ring-indigo-500` → `focus:ring-brand-slate` on inputs.
- **Hover states** (4 files): Link and card hover colors migrated to brand-steel/brand-slate.
- **Accent icons** (8 files): `text-indigo-400/500` → `text-brand-steel` on decorative icons.
- **Spinners** (6 files): Loading indicators migrated from indigo/emerald to brand-steel.
- **Gradient text** (1 file): Welcome.jsx hero text and stats numbers use brand gradient.
- **Card headers** (4 files): `from-indigo-600 via-purple-600 to-pink-600` → `from-brand-slate via-brand-blue to-brand-navy`.
- **QR code canvas** (2 files): `#1a1a2e` → `BRAND.navy` (#101B29), indigo overlays → brand slate.
- **Chart colors** (1 file): FinancialReports COLORS array uses CHART_COLORS from centralized config. Net cash flow line changed from purple to brand slate.
- **BottomNav glow** (1 file): Active indicator gradient migrated to brand.
- **Category colors** (3 files): BusinessCard, FloorMapView, Profile now import centralized `CATEGORY_COLORS`/`CATEGORY_GRADIENTS` from `src/lib/colors.js`.
- **Semantic centralization** (1 file): RecommendationCard status/priority badges import from centralized config.
- **AdBanner.jsx**: Background, button, and badge colors migrated to brand tokens.
- **Register.jsx**: Progress indicators, upload areas, and light backgrounds migrated to brand tokens.

### Intentionally Preserved (Semantic Colors)
The following colors remain as hardcoded Tailwind classes because they carry functional meaning:
- Red (`bg-red-*`, `text-red-*`): Errors, high priority, expenses, negative values
- Green/Emerald: Success states, resolved status, revenue, positive values, notification read actions
- Orange: Warnings, liabilities, expiring items
- Yellow: Medium priority, featured items
- Blue: In-progress status, informational, forecasts
- Purple: Work order type indicators, event post type
- PostCard type configs (announcement=blue, event=purple, offer=green, request=orange)
- RecommendationCard type configs (enhancement=blue, issue=orange, work_order=purple)
- LandlordNotificationBell type colors (request=purple, payment=red, lease=blue)
- LandlordDashboard metric icons (occupancy=emerald, requests=emerald)
- Accounting status badges (active=green, expiring=orange, expired=red)
