# Coding Conventions

**Analysis Date:** 2026-03-27

## Overview

UNIT is a React SPA using JavaScript (ES2022) with JSX, styled with Tailwind CSS and shadcn/ui (New York style) components, backed by Supabase (PostgreSQL, Auth, Storage) with a thin service layer at `src/services/`. Code follows functional component patterns with React Query for server state and useState for local state. No TypeScript in components -- only `jsconfig.json` with `checkJs: true` for path alias resolution.

## Naming Patterns

**Files:**
- Page components: PascalCase `.jsx` (e.g., `Community.jsx`, `LandlordDashboard.jsx`, `AuditPage.jsx`)
- Feature components: PascalCase `.jsx` (e.g., `PostCard.jsx`, `CreatePostModal.jsx`, `PropertySwitcher.jsx`)
- Accounting components: PascalCase `.jsx` in subdirectory (e.g., `accounting/InvoiceModal.jsx`, `accounting/FinancialReports.jsx`)
- Guard components: PascalCase `.jsx` in subdirectory (e.g., `guards/LandlordGuard.jsx`)
- UI primitives: kebab-case `.jsx` in `src/components/ui/` (e.g., `alert-dialog.jsx`, `radio-group.jsx`, `use-toast.jsx`)
- Services: camelCase `.js` (e.g., `supabaseClient.js`, `activityLogs.js`, `accounting.js`)
- Hooks: kebab-case with `use-` prefix `.jsx` (e.g., `use-mobile.jsx`, `use-toast.jsx`)
- Utils/Lib: camelCase `.js` or `.ts` (e.g., `query-client.js`, `colors.js`, `utils.js`)
- Config files: camelCase `.js` (e.g., `pages.config.js`, `vite.config.js`, `playwright.config.js`)

**Functions:**
- Use camelCase for all functions: `getTypeConfig`, `handleSubmit`, `getCategoryLabel`, `handlePropertySelect`
- Event handlers prefixed with `handle`: `handleSubmit`, `handleEditLease`, `handleSwitch`, `handlePositionUpdate`, `handleLogout`
- Getter/lookup functions prefixed with `get`: `getBusinessById`, `getBusinessName`, `getCategoryColor`, `getNotificationIcon`
- Generator functions: camelCase with descriptive name: `generateInvoiceNumber`
- Custom hooks prefixed with `use`: `useAuth`, `useProperty`, `useIsMobile`, `useToast`

**Variables:**
- camelCase for local variables: `isLoading`, `selectedType`, `propertyId`, `searchQuery`, `expandedInvoiceId`
- Boolean variables prefixed with `is`/`show`/`has`: `isLoading`, `showCreateModal`, `isAuthenticated`, `isExpiringSoon`, `isSwitching`
- UPPERCASE for module-level constants: `MOBILE_BREAKPOINT`, `BRAND`, `STATUS_COLORS`, `PAGES`, `CHART_COLORS`, `ENTITY_TYPE_OPTIONS`, `ACTION_OPTIONS`

**Component Props:**
- camelCase: `isOpen`, `onClose`, `onSubmit`, `isLoading`, `propertyId`, `isFeatured`
- Boolean props use `is`/`has`/`compact` prefix: `isOpen`, `isLoading`, `isFeatured`, `compact`
- Callback props use `on` prefix: `onClose`, `onSubmit`, `onSelect`, `onViewCard`, `onPositionUpdate`
- Data props use domain nouns: `businesses`, `leases`, `payments`, `recommendations`, `invoice`, `property`

**Service Exports:**
- Named exports using camelCase with `Service` suffix: `postsService`, `businessesService`, `propertiesService`, `notificationsService`, `activityLogsService`
- Accounting uses entity-specific names via factory: `leasesService`, `invoicesService`, `expensesService`, `paymentsService`, `recurringPaymentsService`

**Context Exports:**
- Provider component: PascalCase, e.g., `AuthProvider`, `PropertyProvider`
- Hook: camelCase with `use` prefix, e.g., `useAuth`, `useProperty`
- Both exported as named exports from the same file

## Code Style

**Formatting:**
- 2-space indentation throughout (except `src/lib/query-client.js` which uses tabs -- an inconsistency)
- No Prettier config -- formatting is manual/editor-based
- Single quotes for JS imports, double quotes for JSX attributes and some UI component imports
- Semicolons used consistently
- No enforced line length maximum

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
- `react/prop-types`: **off** -- No prop-type validation enforced
- `react/react-in-jsx-scope`: **off** -- Not needed in React 17+ JSX transform
- `react/no-unknown-property`: **error** -- Custom ignores: `cmdk-input-wrapper`, `toast-close`
- `react-hooks/rules-of-hooks`: **error** -- Strict hooks rule enforcement
- `no-unused-vars`: **off** -- Deferred to unused-imports plugin

## Import Organization

**Order (follow this sequence for new files):**
1. React and React hooks: `import React, { useState, useEffect } from 'react';`
2. Third-party libraries: `@tanstack/react-query`, `react-router-dom`, `framer-motion`, `date-fns`
3. Service layer imports: `import { postsService } from '@/services/posts';`
4. Direct Supabase client (only when service layer is insufficient): `import { supabase } from '@/services/supabaseClient';`
5. App lib/context imports: `import { useAuth } from '@/lib/AuthContext';` and `import { useProperty } from '@/lib/PropertyContext';`
6. App utilities: `import { createPageUrl } from '@/utils';`
7. Feature components: `import PostCard from '@/components/PostCard';`
8. UI primitives (from shadcn): `import { Button } from "@/components/ui/button";`
9. Icons (lucide-react): `import { Building2, Loader2, Users } from 'lucide-react';`

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
- Standalone functions: named export -- `export async function writeAudit({ ... }) { ... }` (see `src/lib/AuditLogger.js`)

## Component Patterns

**Functional Components Only:**
All components use `export default function ComponentName()` syntax. No class components.

**Page Component Pattern:**
```jsx
// src/pages/Community.jsx -- standard page structure
export default function Community() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId');

  // 1. Local UI state
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 2. Data queries (React Query)
  const { data: property } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => propertiesService.getById(propertyId),
    enabled: !!propertyId
  });

  // 3. Mutations
  const createMutation = useMutation({
    mutationFn: async (data) => postsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', propertyId] });
      setShowCreateModal(false);
    }
  });

  // 4. Derived data / helpers
  const filteredPosts = posts.filter(post => ...);

  // 5. Early returns (loading, error, missing data)
  if (!propertyId) return (<div>No property selected</div>);

  // 6. Main render
  return (<div>...</div>);
}
```

**Landlord Page Pattern:**
Landlord pages use `useProperty()` context instead of URL params for property scoping:
```jsx
// src/pages/LandlordDashboard.jsx
export default function LandlordDashboard() {
  const { activePropertyId: propertyId } = useProperty();
  const { logout } = useAuth();
  // ... queries use propertyId from context, not URL
}
```

**Modal/Dialog Component Pattern:**
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
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* form fields */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Display Component Pattern (cards, list items):**
```jsx
// src/components/PostCard.jsx
export default function PostCard({ post, business }) {
  const getTypeConfig = (type) => { ... };  // local helper
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden bg-white/5 backdrop-blur-xl border-white/10">
        {/* content */}
      </Card>
    </motion.div>
  );
}
```

**Guard Component Pattern:**
```jsx
// src/components/guards/LandlordGuard.jsx
export default function LandlordGuard() {
  const { user, isLoadingAuth, isLandlord } = useAuth();
  if (isLoadingAuth) return (<loading spinner>);
  if (!user) return <Navigate to="/LandlordLogin" replace />;
  if (!isLandlord) return <Navigate to="/Welcome" replace />;
  return <Outlet />;  // renders child routes
}
```

**Context Provider Pattern:**
```jsx
// src/lib/PropertyContext.jsx
const PropertyContext = createContext(null);

export function PropertyProvider({ children }) {
  const [activePropertyId, setActivePropertyId] = useState(
    () => localStorage.getItem('active_property_id') ?? null
  );
  const switchProperty = useCallback((propertyId) => {
    localStorage.setItem('active_property_id', propertyId);
    setActivePropertyId(propertyId);
    queryClient.invalidateQueries();  // clears all cached data
  }, [queryClient]);

  return (
    <PropertyContext.Provider value={{ activePropertyId, switchProperty }}>
      {children}
    </PropertyContext.Provider>
  );
}

export const useProperty = () => {
  const ctx = useContext(PropertyContext);
  if (!ctx) throw new Error('useProperty must be used within PropertyProvider');
  return ctx;
};
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
`src/services/accounting.js` uses a factory to generate identical CRUD services for 5 tables:

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
export const expensesService = createAccountingService('expenses');
export const paymentsService = createAccountingService('payments');
export const recurringPaymentsService = createAccountingService('recurring_payments');
```

**Service Method Naming Conventions:**
- `filter(filters)` -- Query with object-based filters (primary query pattern)
- `list()` -- Fetch all rows (used by `propertiesService.list()`)
- `getById(id)` -- Single row by ID with `.single()`
- `create(data)` -- Insert, `.select().single()`, and return created row
- `update(id, data)` -- Update by ID, `.select().single()`, and return updated row
- `delete(id)` -- Delete by ID, no return value
- Domain-specific: `getVacant(propertyId)` in `src/services/units.js`, `markAllRead(email, propertyId)` in `src/services/notifications.js`, `listByProperty(propertyId)` in `src/services/units.js`

**Error Handling in Services:**
Every service method follows: `if (error) throw error;`. Errors propagate to React Query.

**Supabase Client:**
Singleton in `src/services/supabaseClient.js`. Validates env vars at module load and throws if missing. All services import from this file.

**Storage Service:**
`src/services/storage.js` handles file uploads to the `public-assets` bucket with generated filenames (`uploads/{timestamp}-{random}.{ext}`).

## React Query Conventions

**Query Keys:** Array format with entity name + identifiers:
- `['property', propertyId]`
- `['businesses', propertyId]`
- `['notifications', user?.email, propertyId]`
- `['currentUser']` -- singleton for auth user
- `['leases', propertyId]`
- `['posts', propertyId]`
- `['audit_log', entityTypeFilter, actionFilter, searchEmail]` -- composite filter keys
- `['audit_log', 'invoice', expandedInvoiceId]` -- entity-specific audit queries
- `['landlord-properties', propertyIds]` -- for `PropertySwitcher`
- `['all-properties']` -- for `BrowseProperties`

**Query Configuration (global in `src/lib/query-client.js`):**
- `refetchOnWindowFocus: false`
- `retry: 1`

**Standard Query Pattern:**
```javascript
const { data: businesses = [], isLoading } = useQuery({
  queryKey: ['businesses', propertyId],
  queryFn: async () => businessesService.filter({ property_id: propertyId }),
  enabled: !!propertyId,    // prevent query until dependency is available
  initialData: []           // used for list queries to avoid undefined
});
```

**Mutation Pattern:**
```javascript
const createMutation = useMutation({
  mutationFn: async (data) => postsService.create({ ...data, property_id: propertyId }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['posts', propertyId] });
    setShowCreateModal(false);
  }
  // NOTE: No onError callback -- this is a known gap
});
```

**Invalidation Patterns:**
- Specific key: `queryClient.invalidateQueries({ queryKey: ['posts', propertyId] })`
- Entity-only key (broader): `queryClient.invalidateQueries({ queryKey: ['businesses'] })`
- All queries (on property switch): `queryClient.invalidateQueries()` in `PropertyContext.jsx`
- Multiple invalidations in one onSuccess: common in `Accounting.jsx` and `LandlordRequests.jsx`

**Current User Pattern (duplicated -- use `useAuth()` instead for new code):**
The `['currentUser']` query is duplicated across `Community.jsx`, `NotificationBell.jsx`, `Register.jsx`, `Recommendations.jsx`, and `MyCard.jsx`. Prefer `useAuth()` hook which provides `user` from `AuthContext`.

## Form Handling

**Primary Pattern: useState with controlled inputs:**
```jsx
const [formData, setFormData] = useState({ title: '', content: '', type: 'announcement' });

const handleSubmit = (e) => {
  e.preventDefault();
  onSubmit(formData);
};

<Input
  value={formData.title}
  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
  required
/>
```

**Select Component Pattern (Radix UI):**
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

**Validation:**
- HTML `required` attribute on inputs (sole validation mechanism)
- `e.preventDefault()` on form submit
- No Zod schema validation in use (Zod is installed but unused)
- No React Hook Form in use (installed but unused -- only `src/components/ui/form.jsx` references it)
- No custom validation logic or field-level error display

## CSS/Styling Conventions

**Framework:** Tailwind CSS 3.4.17 with shadcn/ui (New York style, configured in `components.json`)

**Brand Colors (use these Tailwind classes, not raw hex):**
- `brand-navy` (#101B29) -- Primary dark background
- `brand-navy-light` (#1a2d42) -- Hover state for navy
- `brand-blue` (#1D263A) -- Secondary dark background
- `brand-slate` (#465A75) -- Accent/interactive elements
- `brand-slate-light` (#5a7090) -- Hover state for slate
- `brand-steel` (#7C8DA7) -- Secondary text, icons
- `brand-gray` (#E0E1DE) -- Light backgrounds, borders

**Brand Gradients (use these consistently):**
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

**Layout Constraints:**
- Max width: `max-w-6xl mx-auto` (dashboard/admin pages) or `max-w-3xl mx-auto` (content-focused like Community)
- Padding: `px-6` horizontal, `pt-24 pb-24` (pages with header + bottom nav), `pt-24 pb-20` (landlord pages)
- Card rounding: `rounded-xl` or `rounded-2xl`
- Button rounding: Always `rounded-xl` for custom-styled buttons

**Semantic Color Tokens (from `src/lib/colors.js`):**
- Import `CATEGORY_COLORS`, `STATUS_COLORS`, `PRIORITY_COLORS`, `FINANCIAL_COLORS` for Tailwind class maps
- Import `BRAND`, `CHART_COLORS` for hex values in chart contexts (Recharts fill/stroke)

**CSS Variable System (from `src/index.css`):**
- HSL-based CSS custom properties for shadcn/ui theming
- All mapped to Unit brand palette
- Support for `.dark` mode class (configured via `next-themes`)

**Animation (Framer Motion):**
- Standard enter: `initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}`
- Staggered lists: `transition={{ delay: 0.1 + index * 0.05 }}`
- Hover lift: `whileHover={{ y: -2 }}` or `whileHover={{ y: -4 }}`
- Loading spinners: `<Loader2 className="w-8 h-8 animate-spin text-brand-steel" />`

**Icons (Lucide React exclusively):**
- Standard sizes: `w-4 h-4` (inline/buttons), `w-5 h-5` (navigation/section headers), `w-6 h-6` (quick action buttons), `w-8 h-8` (loading), `w-16 h-16` (empty states)

## Error Handling

**Service layer:** All services throw Supabase errors: `if (error) throw error;`

**React Query level:** Errors managed by React Query built-in error state. No `onError` callbacks on any mutation in the codebase.

**Component level:**
- No try-catch blocks in components
- No error boundaries in the component tree
- No user-facing error messages for failed API calls
- Loading states shown via `isLoading` from React Query
- Empty states shown when data arrays are empty

**Auth errors:** `src/lib/AuthContext.jsx` uses try-catch with error type classification (`auth_required`, `user_not_registered`, `unknown`) and renders appropriate error UI in `App.jsx`.

**Silent failures:**
- Activity logging (`src/services/activityLogs.js`): `.catch(() => {})` for fire-and-forget
- Audit logging (`src/lib/AuditLogger.js`): callers use `.catch(() => {})` to avoid blocking mutations

## Toast Notifications

**Libraries:** Both `react-hot-toast` and `sonner` are installed as dependencies. Additionally, shadcn provides a custom toast system in `src/components/ui/use-toast.jsx`.

**Active Toaster:** `src/App.jsx` renders `<Toaster />` from `src/components/ui/toaster.jsx` (the shadcn toast)

**Convention for new code:** Use the shadcn `useToast` hook or `toast()` from `src/components/ui/use-toast.jsx`. Avoid adding new imports from `react-hot-toast` or `sonner` directly.

## Date Formatting

**Libraries:** Both `date-fns` and `moment` are installed
- `date-fns` used in display components: `import { format } from "date-fns"` (e.g., `src/components/PostCard.jsx`)
- `moment` also installed but prefer `date-fns` for new code (tree-shakeable, smaller bundle)

## Deletion Confirmation Pattern

Use `AlertDialog` from shadcn for destructive actions:
```jsx
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="ghost" size="icon"><Trash2 className="w-4 h-4" /></Button>
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

## Logging

- Minimal: `console.error` used only in `src/lib/AuthContext.jsx` for auth failures
- Activity tracking via `activityLogsService.logPageVisit()` in `src/lib/NavigationTracker.jsx`
- Audit logging via `writeAudit()` in `src/lib/AuditLogger.js` for financial/request mutations
- No structured logging framework
- No production monitoring

## Comments

- Minimal commenting throughout codebase -- code is self-documenting through naming
- Section comments in JSX use `{/* Section Name */}` pattern (e.g., `{/* Header */}`, `{/* Key Metrics */}`)
- `src/pages.config.js` has extensive JSDoc explaining auto-generation -- **do not edit this file manually**
- `src/lib/AuditLogger.js` has JSDoc on the `writeAudit()` function with `@param` documentation
- No systematic JSDoc/TSDoc on components or service methods

## Module Design

**Components:** Default export only -- one component per file
**Services:** Named exports -- object with async methods per file
**UI primitives:** Named exports -- component + variants (CVA pattern from shadcn)
**Utilities:** Named exports -- `src/utils/index.ts` is a barrel file
**No barrel files** for components or services -- import from individual files directly
**Context files:** Export both Provider and hook from same file

## TypeScript Usage

- Project uses `jsconfig.json` with `checkJs: true` for path resolution and basic type checking
- Only one `.ts` file: `src/utils/index.ts`
- All components and services use `.jsx` / `.js`
- Type information comes from installed `@types/react`, `@types/react-dom`, `@types/node`
- `jsconfig.json` includes: `src/components/**/*.js`, `src/pages/**/*.jsx`, `src/Layout.jsx`
- `jsconfig.json` excludes: `node_modules`, `dist`, `src/vite-plugins`, `src/components/ui`, `src/api`, `src/lib`
- New utility functions should use `.ts` extension for type safety
- Component files continue using `.jsx`

## Common Anti-Patterns to Avoid

**Do NOT:**
- Read URL params with `window.location.search` in landlord pages -- use `useProperty()` context instead
- Duplicate the `['currentUser']` query pattern -- use `useAuth()` hook from `src/lib/AuthContext.jsx`
- Import `moment` -- use `date-fns` for date formatting
- Add new toast imports from `react-hot-toast` or `sonner` directly -- use the shadcn toast system
- Use relative imports (`../` or `../../`) -- always use `@/` path alias
- Manually edit `src/pages.config.js` -- it is auto-generated
- Place Supabase queries directly in components when a service method exists -- add methods to `src/services/` instead
- Skip the `enabled` flag on queries that depend on async data (e.g., `enabled: !!propertyId`)
- Forget `queryClient.invalidateQueries()` in mutation `onSuccess` handlers

---

*Convention analysis: 2026-03-27*
