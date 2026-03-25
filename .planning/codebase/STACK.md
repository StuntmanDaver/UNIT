# Technology Stack

**Analysis Date:** 2026-03-25

## Languages

**Primary:**
- JavaScript (ES2022) - Frontend application
- JSX/TSX - React component syntax

**Secondary:**
- TypeScript - Type checking via JSConfig (not strict compilation)

## Runtime

**Environment:**
- Node.js (used during build and development)
- Browser (ES2022 target)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (inferred, present in npm projects)

## Frameworks

**Core:**
- React 18.2.0 - UI framework and component library
- React Router DOM 6.26.0 - Client-side routing
- React DOM 18.2.0 - React rendering engine

**Build/Dev:**
- Vite 6.1.0 - Build tool and dev server
- Base44 Vite Plugin 0.2.15 - Custom Vite plugin for Base44 integration
- TypeScript 5.8.2 - Type checking

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
- PostCSS 8.5.3 - CSS processing
- Autoprefixer 10.4.20 - Browser vendor prefixes
- Tailwind Animate 1.0.7 - Animation utilities

**Form Handling:**
- React Hook Form 7.54.2 - Form state management
- React Hook Form Resolvers 4.1.2 - Validation resolvers
- Zod 3.24.2 - Schema validation

**Data Fetching & State:**
- TanStack React Query 5.84.1 - Server state management and caching
- Base44 SDK 0.8.3 - Backend client library for Base44 platform

**UI Component Libraries:**
- Radix UI (20+ component packages @ v1-2) - Unstyled, accessible component primitives
  - Includes: accordion, alert-dialog, avatar, checkbox, dialog, dropdown-menu, label, popover, scroll-area, select, tabs, toast, tooltip, and more
- Class Variance Authority 0.7.1 - CSS class composition
- CLSX 2.1.1 - Conditional CSS class utilities
- Tailwind Merge 3.0.2 - Merge Tailwind classes intelligently

**UI Features:**
- Embla Carousel React 8.5.2 - Carousel/carousel component
- Framer Motion 11.16.4 - Animation library
- Next Themes 0.4.4 - Dark mode/theme switching
- Vaul 1.1.2 - Drawer/modal component
- Commander (cmdk) 1.0.0 - Command palette/searchable menu

**Rich Content:**
- React Markdown 9.0.1 - Markdown rendering
- React Quill 2.0.0 - Rich text editor
- HTML2Canvas 1.4.1 - HTML to image conversion
- jsPDF 4.0.0 - PDF generation

**Data Visualization & Maps:**
- Recharts 2.15.4 - Chart and graph library
- React Leaflet 4.2.1 - Map integration (Leaflet)
- Three.js 0.171.0 - 3D graphics

**Date & Utilities:**
- Date-fns 3.6.0 - Date manipulation and formatting
- Moment 2.30.1 - Date library (legacy, coexists with date-fns)
- Lodash 4.17.21 - Utility functions
- React Day Picker 8.10.1 - Calendar picker component
- Input OTP 1.4.2 - OTP input component
- Canvas Confetti 1.9.4 - Confetti animation

**UI Feedback:**
- React Hot Toast 2.6.0 - Toast notifications
- Sonner 2.0.1 - Toast notification library
- Lucide React 0.475.0 - Icon library

**Drag & Drop:**
- Hello Pangea DnD 17.0.0 - Drag and drop library

**Linting:**
- ESLint 9.19.0 - JavaScript linting
- ESLint Plugin React 7.37.4 - React linting rules
- ESLint Plugin React Hooks 5.0.0 - React Hooks linting
- ESLint Plugin React Refresh 0.4.18 - Vite HMR refresh rules
- ESLint Plugin Unused Imports 4.3.0 - Remove unused imports

**Additional Dev Tools:**
- Vite React Plugin 4.3.4 - React-specific Vite plugin
- Baseline Browser Mapping 2.8.32 - Browser compatibility mapping
- Globals 15.14.0 - Global variables for different environments

## Configuration

**Environment:**
- Environment variables loaded via `import.meta.env` (Vite pattern)
- Configuration read from: `src/lib/app-params.js`
- Key env vars:
  - `VITE_BASE44_APP_ID` - Base44 application ID
  - `VITE_BASE44_FUNCTIONS_VERSION` - Base44 functions version
  - `VITE_BASE44_APP_BASE_URL` - Base44 app base URL
- Fallback to URL parameters: `app_id`, `access_token`, `from_url`, `functions_version`, `app_base_url`
- Storage: Browser localStorage with `base44_` prefix

**Build:**
- Entry point: `src/main.jsx`
- Output: Standard Vite dist folder
- Configuration: `vite.config.js`
- PostCSS: `postcss.config.js`
- Tailwind: `tailwind.config.js`
- ESLint: `eslint.config.js`

**Path Aliases:**
- `@/*` → `./src/*` (configured in jsconfig.json)

## Platform Requirements

**Development:**
- Node.js (version not specified in package.json)
- npm (for package management)

**Production:**
- Modern browser support (ES2022 target)
- CDN or static hosting capable of serving SPA
- Access to Base44 platform (for SDK functionality)

---

*Stack analysis: 2026-03-25*
