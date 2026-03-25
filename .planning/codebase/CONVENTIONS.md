# Coding Conventions

**Analysis Date:** 2026-03-25

## Naming Patterns

**Files:**
- **Components:** PascalCase (e.g., `PostCard.jsx`, `CreatePostModal.jsx`, `BottomNav.jsx`)
- **Pages:** PascalCase (e.g., `Welcome.jsx`, `Profile.jsx`, `Community.jsx`)
- **Utils/Lib:** camelCase (e.g., `app-params.js`, `query-client.js`)
- **Hooks:** kebab-case with `use-` prefix (e.g., `use-mobile.jsx`)
- **UI Components:** kebab-case (e.g., `alert-dialog.jsx`, `radio-group.jsx`)

**Functions:**
- camelCase for all functions (e.g., `getTypeConfig`, `handleSubmit`, `getCategoryLabel`)
- Prefix query hooks with `use` (e.g., `useIsMobile`, `useQuery`)
- Factory/utility functions use camelCase (e.g., `createPageUrl`, `createPageUrl`)

**Variables:**
- camelCase for local variables (e.g., `isLoading`, `selectedType`, `propertyId`)
- UPPERCASE for constants (e.g., `MOBILE_BREAKPOINT`)
- CSS class variables written in camelCase when assigned to variables (e.g., `typeConfig.color`)

**Types:**
- PascalCase for TypeScript types and interfaces (not used in this project yet, but would follow React conventions)
- Generic component props follow camelCase

## Code Style

**Formatting:**
- No explicit Prettier configuration detected
- Code uses consistent 2-space indentation
- Line lengths vary; no enforced maximum observed
- JSX formatting spreads attributes on single lines for readability

**Linting:**
- ESLint 9.19.0 with Flat Config (`eslint.config.js`)
- **Active plugins:**
  - `@eslint/js` (recommended rules)
  - `eslint-plugin-react` (React best practices)
  - `eslint-plugin-react-hooks` (React hooks rules)
  - `eslint-plugin-unused-imports` (detects unused imports)

**Key active rules:**
- `unused-imports/no-unused-imports`: error - Enforces removal of unused imports
- `unused-imports/no-unused-vars`: warn - Allows underscore-prefixed unused params
- `react/jsx-uses-vars`: error - Prevents "unused" warnings on JSX-only imports
- `react/jsx-uses-react`: error - React import validation
- `react/prop-types`: off - Disabled (using TypeScript or no prop validation)
- `react/react-in-jsx-scope`: off - Not required in modern React
- `react/no-unknown-property`: error - Custom ignores for `cmdk-input-wrapper`, `toast-close`
- `react-hooks/rules-of-hooks`: error - Enforces React hooks rules strictly

## Import Organization

**Order:**
1. React and built-in libraries (`import React`, standard library imports)
2. External dependencies (`@base44/sdk`, `@tanstack/react-query`, `lucide-react`, `framer-motion`)
3. UI components from `@/components/ui`
4. Custom components from `@/components`
5. Utilities from `@/`
6. Local relative imports (less common)

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `jsconfig.json`)
- All internal imports use the `@/` prefix for consistency
- Examples: `@/api/base44Client`, `@/components/PostCard`, `@/utils`, `@/lib/query-client`

**Import style:**
- Default exports for components: `import PostCard from '@/components/PostCard'`
- Named exports for utilities: `import { useQuery, useMutation } from '@tanstack/react-query'`
- Mixed imports accepted when appropriate

## Error Handling

**Patterns:**
- No explicit try-catch blocks observed in current codebase
- **Query/async handling:** Uses `@tanstack/react-query` with `useQuery` and `useMutation`
  - `enabled` property used to conditionally run queries (e.g., `enabled: !!propertyId`)
  - `initialData` used to provide empty arrays for list queries
  - No explicit error handling in query functions currently
- **Form submission:** Uses `e.preventDefault()` before processing
- **Validation:** No validation middleware observed; forms submit directly to mutations
- **Loading states:** Managed via `isLoading` from React Query, displayed as spinners or placeholder content

**Missing error handling:**
- No error callbacks in mutations (e.g., `onError` handlers)
- No error boundaries detected
- No user-facing error messages for failed API calls
- Failed queries default to React Query's built-in behavior (silent failures with empty data)

## Logging

**Framework:** Native `console` object (no logging library detected)

**Patterns:**
- Minimal logging observed in source code
- No structured logging approach
- No log levels or log management
- Console logging would be acceptable for debugging but not production monitoring

## Comments

**When to Comment:**
- Very minimal commenting observed in codebase
- Code is generally self-documenting through clear naming
- `pages.config.js` has extensive JSDoc-style comments explaining the auto-generated page routing system

**JSDoc/TSDoc:**
- Not systematically used in current codebase
- No TypeScript usage yet (JavaScript with type checking via `jsconfig.json`)
- When documentation is added, should follow JSDoc 3 format

**Example:**
```javascript
/**
 * pages.config.js - Page routing configuration
 *
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 */
```

## Function Design

**Size:**
- Small focused functions (100-200 lines acceptable for page components)
- Complex pages like `Accounting.jsx` (496 lines) and `MyCard.jsx` (439 lines) indicate need for refactoring
- Utility functions typically 3-15 lines

**Parameters:**
- Props passed as single object (destructured in function signature)
- Example: `export default function PostCard({ post, business })`
- React hooks used for state management rather than function parameters
- URL parameters extracted via `URLSearchParams` in page components

**Return Values:**
- Components return JSX elements
- Utility functions return transformed data (strings, objects, arrays)
- Query functions return data or arrays
- No explicit `null` checks before returns; relies on optional chaining (`?.`)

## Module Design

**Exports:**
- **Components:** Default export only
  - Example: `export default function PostCard({ post, business })`
- **Utilities:** Named exports
  - Example: `export function createPageUrl(pageName: string)`
- **API client:** Default export
  - Example: `export const base44 = createClient({...})`
- **Query client:** Named constant export
  - Example: `export const queryClientInstance = new QueryClient(...)`

**Barrel Files:**
- `src/utils/index.ts` acts as a barrel file exporting utility functions
- `src/components/ui/*` are individual component files (no barrel file)
- Page routing handled by auto-generated `pages.config.js` (do not manually edit)

## TypeScript Usage

**Current Status:**
- Project configured with `jsconfig.json` (JavaScript + type checking)
- `checkJs: true` enables type checking on `.js` files
- No `.ts` or `.tsx` files in main codebase (except utilities `src/utils/index.ts`)
- Type information available from external libraries but not enforced in components

**When to use:**
- New utility functions should use TypeScript (`.ts` extension) for better type safety
- Component files should continue using `.jsx` unless complex typing is needed
- External dependencies like `@base44/sdk` and `@tanstack/react-query` provide type definitions

## Code Patterns in Practice

**Query Hook Pattern:**
```javascript
const { data: business, isLoading } = useQuery({
  queryKey: ['business', businessId],
  queryFn: async () => {
    const businesses = await base44.entities.Business.filter({ id: businessId });
    return businesses[0];
  },
  enabled: !!businessId
});
```

**Component State Pattern:**
```javascript
const [formData, setFormData] = useState({
  type: 'announcement',
  title: '',
  content: ''
});

const handleSubmit = (e) => {
  e.preventDefault();
  onSubmit(formData);
};
```

**Config/Mapping Objects:**
```javascript
const getTypeConfig = (type) => {
  const configs = {
    announcement: { icon: Megaphone, color: 'bg-blue-100 text-blue-700' },
    event: { icon: Calendar, color: 'bg-purple-100 text-purple-700' }
  };
  return configs[type] || configs.announcement;
};
```

**Conditional Rendering:**
```javascript
{post.type === 'event' && post.event_date && (
  <div className="mt-4 p-3 bg-purple-50 rounded-xl">
    {/* content */}
  </div>
)}
```

---

*Convention analysis: 2026-03-25*
