# Coding Conventions

**Analysis Date:** 2026-03-25

## Overview

UNIT is a React SPA using JavaScript (ES2022) with JSX, styled with Tailwind CSS and shadcn/ui components. The codebase recently migrated from Base44 BaaS to Supabase, introducing a service layer pattern at `src/services/`. Code follows functional component patterns with React Query for server state and useState for local state. No TypeScript in components -- only `jsconfig.json` with `checkJs: true` for path alias resolution.

## Naming Patterns

**Files:**
- Page components: PascalCase `.jsx` (e.g., `Community.jsx`, `LandlordDashboard.jsx`, `BrowseProperties.jsx`)
- Feature components: PascalCase `.jsx` (e.g., `PostCard.jsx`, `CreatePostModal.jsx`, `BusinessQRCode.jsx`)
- UI primitives: kebab-case `.jsx` (e.g., `alert-dialog.jsx`, `radio-group.jsx`, `dropdown-menu.jsx`) -- located in `src/components/ui/`
- Services: camelCase `.js` (e.g., `supabaseClient.js`, `activityLogs.js`, `accounting.js`)
- Hooks: kebab-case with `use-` prefix `.jsx` (e.g., `use-mobile.jsx`)
- Utils/Lib: camelCase `.js` or `.ts` (e.g., `query-client.js`, `colors.js`, `utils.js`)
- Config: camelCase `.js` (e.g., `pages.config.js`, `vite.config.js`)

**Functions:**
- Use camelCase for all functions: `getTypeConfig`, `handleSubmit`, `getCategoryLabel`, `handlePropertySelect`
- Event handlers prefixed with `handle`: `handleSubmit`, `handleEditLease`, `handleCreateLease`, `handlePositionUpdate`
- Getter/lookup functions prefixed with `get`: `getBusinessById`, `getBusinessName`, `getCategoryColor`, `getNotificationIcon`
- Prefix custom hooks with `use`: `useAuth`, `useIsMobile`

**Variables:**
- camelCase for local variables: `isLoading`, `selectedType`, `propertyId`, `searchQuery`
- Boolean variables prefixed with `is`/`show`/`has`: `isLoading`, `showCreateModal`, `isAuthenticated`, `isExpiringSoon`
- UPPERCASE for module-level constants: `MOBILE_BREAKPOINT`, `BRAND`, `STATUS_COLORS`, `PAGES`

**Component Props:**
- camelCase: `isOpen`, `onClose`, `onSubmit`, `isLoading`, `propertyId`, `isFeatured`
- Boolean props use `is`/`has` prefix: `isOpen`, `isLoading`, `isFeatured`, `compact`
- Callback props use `on` prefix: `onClose`, `onSubmit`, `onSelect`, `onViewCard`, `onPositionUpdate`

**Service Exports:**
- Named exports using camelCase with `Service` suffix: `postsService`, `businessesService`, `propertiesService`, `notificationsService`
- Exception: accounting uses entity-specific names: `leasesService`, `invoicesService`, `expensesService`, `paymentsService`

## Code Style

**Formatting:**
- 2-space indentation throughout
- No Prettier config -- formatting is manual/editor-based
- Single quotes for JS imports, double quotes for JSX attributes
- Semicolons used consistently

**Linting:**
- ESLint 9.19.0 with Flat Config: `eslint.config.js`
- Scoped to `src/components/**/*.{js,mjs,cjs,jsx}`, `src/pages/**/*.{js,mjs,cjs,jsx}`, `src/Layout.jsx`
- Explicitly ignores: `src/lib/**/*`, `src/components/ui/**/*`
- Run with: `npm run lint` (uses `--quiet` flag) or `npm run lint:fix`

**Active ESLint Rules:**
- `unused-imports/no-unused-imports`: **error** -- Removes unused imports automatically with `--fix`
- `unused-imports/no-unused-vars`: **warn** -- Allows underscore-prefixed unused params (`^_`)
- `react/jsx-uses-vars`: **error** -- Prevents false "unused" on JSX-only imports
- `react/jsx-uses-react`: **error** -- React import validation
- `react/prop-types`: **off** -- No prop-type validation
- `react/react-in-jsx-scope`: **off** -- Not needed in React 17+ JSX transform
- `react/no-unknown-property`: **error** -- Custom ignores: `cmdk-input-wrapper`, `toast-close`
- `react-hooks/rules-of-hooks`: **error** -- Strict hooks rule enforcement
- `no-unused-vars`: **off** -- Deferred to unused-imports plugin

## Import Organization

**Order (follow this sequence for new files):**
1. React and React hooks: `import React, { useState, useEffect } from 'react';`
2. Third-party libraries: `@tanstack/react-query`, `react-router-dom`, `framer-motion`, `date-fns`, `moment`
3. Service layer imports: `import { postsService } from '@/services/posts';`
4. Direct Supabase client (only when needed for auth): `import { supabase } from '@/services/supabaseClient';`
5. App utilities: `import { createPageUrl } from '@/utils';`
6. Feature components: `import PostCard from '@/components/PostCard';`
7. UI primitives (from shadcn): `import { Button } from "@/components/ui/button";`
8. Icons (lucide-react): `import { Building2, Loader2, Users } from 'lucide-react';`

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in both `jsconfig.json` and `vite.config.js`)
- Use `@/` prefix for ALL internal imports -- never use relative paths like `../../`
- Exception: `src/pages.config.js` uses relative `'./pages/...'` for auto-generated page imports
- Exception: One instance of relative import in `LandlordDashboard.jsx`: `'../components/LandlordNotificationBell'` -- prefer `@/` alias instead

**Export Patterns:**
- Components: default export -- `export default function PostCard({ ... }) {}`
- Services: named exports -- `export const postsService = { ... };`
- UI primitives: named exports -- `export { Button, buttonVariants }`
- Utilities: named exports -- `export function createPageUrl(pageName) { ... }`
- Context: named exports for provider and hook -- `export const AuthProvider`, `export const useAuth`

## Component Patterns

**Functional Components Only:**
All components are functional. Use `export default function ComponentName()` syntax.

```jsx
// Page component pattern (src/pages/Community.jsx)
export default function Community() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  // Local state
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data queries
  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => propertiesService.getById(propertyId),
    enabled: !!propertyId
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => postsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', propertyId] });
      setShowCreateModal(false);
    }
  });

  // Render
  return (<div>...</div>);
}
```

**Feature Component Pattern (modals, cards):**
```jsx
// src/components/CreatePostModal.jsx
export default function CreatePostModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({ ... });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <form onSubmit={handleSubmit}>...</form>
      </DialogContent>
    </Dialog>
  );
}
```

**Display Component Pattern (cards, list items):**
```jsx
// src/components/PostCard.jsx
export default function PostCard({ post, business }) {
  const getTypeConfig = (type) => { ... };
  return (<Card>...</Card>);
}
```

## Service Layer Patterns

**Standard Service Object:**
Each service file in `src/services/` exports a named constant object with async methods.

```javascript
// src/services/posts.js
import { supabase } from './supabaseClient';

export const postsService = {
  async filter(filters, orderBy = 'created_date', ascending = false) {
    let query = supabase.from('posts').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(postData) {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
```

**CRUD Factory Pattern (for related entities):**
`src/services/accounting.js` uses a factory function to generate identical CRUD services:

```javascript
function createAccountingService(tableName) {
  return {
    async filter(filters, orderBy = null, ascending = false) { ... },
    async create(record) { ... },
    async update(id, updates) { ... },
    async delete(id) { ... }
  };
}

export const leasesService = createAccountingService('leases');
export const invoicesService = createAccountingService('invoices');
```

**Service method naming conventions:**
- `filter(filters)` -- Query with object-based filters (primary pattern)
- `list()` -- Fetch all rows
- `getById(id)` -- Single row by ID
- `create(data)` -- Insert and return
- `update(id, data)` -- Update by ID and return
- `delete(id)` -- Delete by ID
- `getVacant(propertyId)` -- Domain-specific queries (example from `src/services/units.js`)
- `markAllRead(email, propertyId)` -- Domain-specific batch operations (example from `src/services/notifications.js`)

**Error handling in services:**
Every service method follows the pattern: `if (error) throw error;`. Errors are thrown and expected to be caught by React Query or the calling component.

## State Management Patterns

**Server State (React Query):**
- Use `useQuery` for data fetching with `queryKey` arrays: `['entity', id]`
- Use `useMutation` for create/update/delete operations
- Call `queryClient.invalidateQueries()` in `onSuccess` to refresh related data
- Use `enabled` flag to prevent queries until dependencies are available: `enabled: !!propertyId`
- Use `initialData: []` for list queries to avoid undefined during loading

**Local State (useState):**
- Modal visibility: `const [showCreateModal, setShowCreateModal] = useState(false);`
- Form data: `const [formData, setFormData] = useState({ ... });`
- UI selections: `const [selectedType, setSelectedType] = useState('all');`
- Edit tracking: `const [editingLease, setEditingLease] = useState(null);`

**Auth State (React Context):**
- `AuthProvider` wraps entire app at `src/lib/AuthContext.jsx`
- Access via `useAuth()` hook
- Provides: `user`, `isAuthenticated`, `isLoadingAuth`, `authError`, `logout`, `navigateToLogin`

**URL Parameters (for page context):**
- Extracted in page components: `const urlParams = new URLSearchParams(window.location.search);`
- Common params: `propertyId`, `tab`, `id`, `businessId`
- Navigation uses: `navigate(createPageUrl('PageName') + '?propertyId=' + id)`

**Session Storage (landlord context):**
- `sessionStorage.getItem('landlord_property_id')` -- used by `LandlordDashboard.jsx` for session verification
- Only used for landlord authentication flows

## Form Handling

**Pattern 1: Simple useState (most common):**
```jsx
const [formData, setFormData] = useState({ title: '', content: '' });

const handleSubmit = (e) => {
  e.preventDefault();
  onSubmit(formData);
};

<Input
  value={formData.title}
  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
/>
```

**Pattern 2: Select components (Radix UI):**
```jsx
<Select
  value={formData.business_id}
  onValueChange={(value) => setFormData({...formData, business_id: value})}
>
  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
  <SelectContent>
    {items.map(item => (
      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Validation approach:**
- HTML `required` attribute on form inputs
- `e.preventDefault()` on form submit
- No Zod schema validation in use despite Zod being installed as a dependency
- No React Hook Form usage in current components despite being a dependency
- No custom validation logic or error display for field-level validation

## CSS/Styling Conventions

**Framework:** Tailwind CSS 3.4.17 with shadcn/ui component library

**Brand Colors (use these Tailwind classes, not raw hex):**
- `brand-navy` (#101B29) -- Primary dark background
- `brand-navy-light` (#1a2d42) -- Hover state for navy
- `brand-blue` (#1D263A) -- Secondary dark background
- `brand-slate` (#465A75) -- Accent/interactive elements
- `brand-slate-light` (#5a7090) -- Hover state for slate
- `brand-steel` (#7C8DA7) -- Secondary text, icons
- `brand-gray` (#E0E1DE) -- Light backgrounds, borders

**Brand Gradients (standard patterns -- use these consistently):**
- Page backgrounds: `bg-gradient-to-br from-brand-navy via-brand-blue to-brand-navy`
- Primary buttons: `bg-gradient-to-r from-brand-slate to-brand-navy hover:from-brand-slate-light hover:to-brand-navy-light`
- Icon containers: `bg-gradient-to-br from-brand-slate to-brand-navy`
- Logo badge gradient: `from-brand-slate via-brand-steel to-brand-gray`

**Glass-morphism Pattern (common in dark-themed sections):**
```
bg-white/5 backdrop-blur-xl border-white/10
hover:bg-white/10 hover:border-white/20 transition-all
```

**Header Pattern (fixed, blurred):**
```
fixed top-0 left-0 right-0 z-40 bg-brand-navy/40 backdrop-blur-2xl border-b border-white/5
```

**Layout constraints:**
- Max width: `max-w-6xl mx-auto` (pages) or `max-w-3xl mx-auto` (content-focused pages like Community)
- Padding: `px-6` horizontal, `pt-24 pb-24` for pages with fixed header + bottom nav
- Card rounding: `rounded-xl` or `rounded-2xl`
- Button rounding: Always `rounded-xl`

**Semantic Color Tokens (from `src/lib/colors.js`):**
- Import and use centralized color maps: `CATEGORY_COLORS`, `STATUS_COLORS`, `PRIORITY_COLORS`, `FINANCIAL_COLORS`, `CHART_COLORS`
- For non-Tailwind contexts (Recharts fill/stroke), use `BRAND` and `CHART_COLORS` hex constants from `src/lib/colors.js`

**CSS Variable System (from `src/index.css`):**
- HSL-based CSS custom properties for shadcn/ui theming
- All mapped to Unit brand palette
- Support for `.dark` mode class (configured via `next-themes`)

**Animation:**
- Framer Motion for enter/exit animations and hover effects
- Standard enter pattern: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- Staggered lists: `transition={{ delay: 0.1 + index * 0.05 }}`
- Hover lift: `whileHover={{ y: -2 }}` or `whileHover={{ y: -4 }}`
- Loading spinners: `<Loader2 className="w-8 h-8 animate-spin text-brand-steel" />`

**Icons:**
- Lucide React exclusively: `import { Building2, Users, Loader2 } from 'lucide-react';`
- Standard sizes: `w-4 h-4` (inline/buttons), `w-5 h-5` (navigation), `w-8 h-8` (loading), `w-16 h-16` (empty states)

## Error Handling

**Service layer:** All services throw Supabase errors via `if (error) throw error;`

**React Query level:** Errors are managed by React Query's built-in error state. No `onError` callbacks are defined on mutations.

**Component level:**
- No try-catch blocks in components
- No error boundaries
- No user-facing error messages for failed API calls
- Loading states shown via `isLoading` from React Query
- Empty states shown when data arrays are empty

**Auth errors:** `src/lib/AuthContext.jsx` uses try-catch with error type classification (`auth_required`, `user_not_registered`, `unknown`) and renders appropriate error UI.

**Silent failures:** Activity logging (`src/services/activityLogs.js`) uses `.catch(() => {})` for fire-and-forget operations.

## Logging

- Minimal: `console.error` used only in `AuthContext.jsx` for auth failures
- Activity tracking via `activityLogsService.logPageVisit()` in `NavigationTracker.jsx`
- No structured logging framework
- No log levels or production monitoring

## Comments

- Minimal commenting throughout codebase
- Section comments in JSX use `{/* Section Name */}` pattern
- `src/pages.config.js` has extensive JSDoc explaining auto-generation rules -- **do not edit this file manually**
- No TSDoc/JSDoc on functions or components

## Module Design

**Components:** Default export only -- one component per file
**Services:** Named exports -- object with async methods per file
**UI primitives:** Named exports -- component + variants (CVA pattern)
**Utilities:** Named exports -- `src/utils/index.ts` is a barrel file
**No barrel files** for components or services -- import from individual files directly

## TypeScript Usage

- Project uses `jsconfig.json` with `checkJs: true` for path resolution and basic type checking
- Only one `.ts` file in codebase: `src/utils/index.ts`
- All components and services use `.jsx` / `.js`
- Type information comes from installed `@types/react`, `@types/react-dom`, `@types/node`
- `jsconfig.json` includes: `src/components/**/*.js`, `src/pages/**/*.jsx`, `src/Layout.jsx`
- `jsconfig.json` excludes: `node_modules`, `dist`, `src/vite-plugins`, `src/components/ui`, `src/api`, `src/lib`
- New utility functions should use `.ts` for type safety
- Component files continue using `.jsx`

## React Query Conventions

**Query Keys:** Use array format with entity name + identifier:
- `['property', propertyId]`
- `['businesses', propertyId]`
- `['notifications', user?.email, propertyId]`
- `['currentUser']` -- singleton for auth user
- `['leases', propertyId]`
- `['posts', propertyId]`

**Query Configuration (global):** Set in `src/lib/query-client.js`:
- `refetchOnWindowFocus: false`
- `retry: 1`

**Invalidation Pattern:** Always use exact query key prefix:
```javascript
queryClient.invalidateQueries({ queryKey: ['posts', propertyId] });
```

**Current User Pattern (repeated across components -- duplicated in Community.jsx, NotificationBell.jsx, Register.jsx):**
```javascript
const { data: user } = useQuery({
  queryKey: ['currentUser'],
  queryFn: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
    return null;
  }
});
```

## Toast Notifications

**Libraries:** Both `react-hot-toast` and `sonner` are installed (two competing toast libraries)
**Toaster component:** `src/components/ui/toaster.jsx` wraps the toast provider
**Usage:** Toast calls are made in mutation success handlers (sparingly used)
**Convention:** Use `sonner` (via `toast()`) for new code -- it is the more modern option

## Date Formatting

**Libraries:** Both `date-fns` and `moment` are installed
- `date-fns` used in display components: `import { format } from "date-fns"` -- see `src/components/PostCard.jsx`
- `moment` used for relative time: `moment(date).fromNow()` -- see `src/components/NotificationBell.jsx`
- **Prefer `date-fns`** for new code (tree-shakeable, smaller bundle)

## Deletion Confirmation Pattern

Use `AlertDialog` from shadcn for destructive actions:
```jsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
      <Trash2 className="w-4 h-4" />
    </Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete Item</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(id)}>
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

*Convention analysis: 2026-03-25*
