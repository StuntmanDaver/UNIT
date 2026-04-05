# Milestone 2: Core MVP — Design Spec

**Date:** 2026-04-05
**Parent Spec:** `2026-04-04-expo-mobile-rebuild-design.md`
**Scope:** M1 bug fixes + 4 tenant tab screens + 4 admin screens + shared UI components
**Deadline:** May 1, 2026 (contract: $4,000 payment)
**Approach:** Components-first, then screens

---

## 0. Prerequisites: M1 Fixes

Critical issues discovered during M1 audit that must be resolved before M2 screen work begins.

### Fix 0.1: Forgot Password — Non-Functional Button

**File:** `app/(auth)/login.tsx` (lines 49-55)
**Bug:** "Forgot password?" button shows a toast instead of calling `supabase.auth.resetPasswordForEmail(email)`.
**Fix:** Replace toast-only handler with actual password reset email trigger. Validate email field is filled before sending. Show success toast on send, error toast on failure.

### Fix 0.2: Notifications Table Missing `data` Column

**Issue:** `notifications` table has no `data` column for structured metadata (deep link targets, related entity info).
**Fix:** New migration `007_m2_schema_fixes.sql`:
```sql
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;
```

### Fix 0.3: Posts Table Missing Type CHECK Constraint

**Issue:** `posts.type` accepts any string — should be constrained.
**Fix:** In same migration `007_m2_schema_fixes.sql`:
```sql
ALTER TABLE posts ADD CONSTRAINT check_post_type
  CHECK (type IN ('announcement', 'event', 'offer'));
```

### Fix 0.4: businessesService.filter() — No Text Search

**File:** `services/businesses.ts`
**Bug:** `filter()` only uses `.eq()` for each key. Cannot search by business name or description.
**Fix:** Add optional `search` parameter. When provided, use `.or()` with `.ilike()` on `business_name` and `business_description` columns:
```typescript
if (search) {
  query = query.or(`business_name.ilike.%${search}%,business_description.ilike.%${search}%`);
}
```

### Fix 0.5: postsService — Missing CRUD Methods

**File:** `services/posts.ts`
**Bug:** Missing `getById()`, `update()`, `delete()`.
**Fix:** Add three methods following the same pattern as other services:
- `getById(id: string): Promise<Post>` — `.eq('id', id).single()`
- `update(id: string, updates: Partial<Post>): Promise<Post>` — `.update(updates).eq('id', id).select().single()`
- `delete(id: string): Promise<void>` — `.delete().eq('id', id)`

### Fix 0.6: CATEGORY_COLORS Incomplete

**File:** `constants/colors.ts`
**Bug:** `CATEGORY_COLORS` missing 6 of 15 categories: manufacturing, logistics, food_service, professional_services, healthcare, automotive.
**Fix:** Add missing entries:
```typescript
manufacturing: '#78716C',    // warm gray (stone-500)
logistics: '#0EA5E9',        // sky blue (sky-500)
food_service: '#D97706',     // amber (amber-600, distinct from construction orange #F97316)
professional_services: '#6366F1', // indigo (indigo-500)
healthcare: '#14B8A6',       // teal (teal-500, distinct from medical green #10B981)
automotive: '#DC2626',       // dark red (red-600, distinct from restaurant red #EF4444)
```
All 15 categories now have visually distinct colors with no collisions.

### Fix 0.7: adminService.getStats() Semantic Bug

**File:** `services/admin.ts` (lines 56-88)
**Bug:** `getStats()` queries `posts` table but labels result as `activePromotions`. Should query `advertiser_promotions` where `approval_status = 'approved'` and `created_at` within last 30 days.
**Fix:** Replace posts query with:
```typescript
const { count: activePromotions } = await supabase
  .from('advertiser_promotions')
  .select('*', { count: 'exact', head: true })
  .eq('property_id', propertyId)
  .eq('approval_status', 'approved')
  .gte('created_at', thirtyDaysAgo);
```

### Fix 0.8: Admin Navigation Inaccessible

**File:** `app/(tabs)/_layout.tsx`
**Bug:** `isAdmin` is imported but unused. No way to reach `(admin)/` screens from the tab bar.
**Fix:** Add conditional 6th tab for admin users:
```tsx
{isAdmin && (
  <Tabs.Screen
    name="admin"
    options={{
      title: 'Admin',
      tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
    }}
  />
)}
```
Create `app/(tabs)/admin.tsx` as a redirect screen that calls `router.replace('/(admin)/')` in a `useEffect` on mount. This keeps the `(admin)` route group as a separate Stack (preserving its own navigation history) while giving it a tab entry point. The redirect approach is simpler and avoids Expo Router issues with nested tab-in-tab layouts.

### Fix 0.9: add-property-to-admin Missing Duplicate Check

**File:** `supabase/functions/add-property-to-admin/index.ts`
**Bug:** Blindly appends property_id to array — can accumulate duplicates.
**Fix:** Check if property_id already exists in array before appending:
```typescript
if (currentPropertyIds.includes(propertyId)) {
  return new Response(JSON.stringify({ success: true, message: 'Already assigned' }), { status: 200 });
}
```

---

## 1. New Dependencies

Packages to install for M2 (verified not already in package.json):

| Package | Purpose |
|---------|---------|
| `react-native-qrcode-svg` | QR codes in Directory detail + Profile |
| `@gorhom/bottom-sheet` | Detail/edit sheets in Admin screens |
| `expo-sharing` | Native share sheet in Directory detail + Profile |
| `react-native-reanimated` | Bottom sheet peer dependency |
| `react-native-gesture-handler` | Bottom sheet peer dependency |

**Not needed for M2** (deferred to M3):
- `expo-notifications` — push notification client
- `victory-native` — charts for admin dashboard

---

## 2. Shared UI Components (Phase 1)

Build these before any screens. All go in `components/ui/` or `components/tenant/` or `components/admin/`.

### 2.1 Generic UI Components (`components/ui/`)

| Component | Props | Notes |
|-----------|-------|-------|
| **Card** | `children`, `onPress?`, `className?` | Pressable when `onPress` provided. Shadow + rounded-xl. |
| **Badge** | `label`, `color` (bg+text tuple), `size?: 'sm' \| 'md'` | Pill shape. Used for categories and statuses. |
| **Avatar** | `imageUrl?`, `name`, `size?: number` | Shows image or initials fallback (first letter, colored background). |
| **SearchBar** | `value`, `onChangeText`, `placeholder?` | TextInput with search icon (lucide `Search`) + clear button (lucide `X`). Parent handles debounce. |
| **CategoryChips** | `categories`, `selected`, `onSelect` | Horizontal FlatList of chips. Tapping toggles selection. Uses `BUSINESS_CATEGORIES` + `CATEGORY_COLORS`. |
| **SegmentedControl** | `segments: string[]`, `selected`, `onChange` | Tab bar for filtering. Highlighted segment with brand-navy background. |
| **FAB** | `onPress`, `icon?` | Floating action button, bottom-right, brand-navy background. Default icon: `Plus`. |
| **EmptyState** | `icon`, `title`, `message`, `actionLabel?`, `onAction?` | Centered layout with lucide icon, title, subtitle, optional CTA button. |
| **LoadingSkeleton** | `variant: 'card' \| 'list-item' \| 'detail'` | Animated shimmer placeholders. Shape matches variant. Uses `react-native-reanimated` for shimmer animation. |
| **StatusBadge** | `status: 'invited' \| 'active' \| 'inactive' \| 'pending' \| 'approved' \| 'rejected'` | Wraps Badge with STATUS_COLORS lookup. |
| **Modal** | `visible`, `onClose`, `title`, `children`, `actions?` | Centered overlay. Actions array of `{ label, onPress, variant }`. |

### 2.2 Domain Components (`components/tenant/`)

| Component | Props | Notes |
|-----------|-------|-------|
| **BusinessCard** | `business: Business`, `onPress?`, `compact?: boolean` | Card with Avatar, name, category Badge, description (2-line clamp), unit number. Compact variant for lists. |
| **PostCard** | `post: Post`, `authorBusiness?: Business` | Card with author Avatar + name, type Badge, title, content preview (3-line clamp), event date if applicable, relative timestamp. |
| **PromotionCard** | `variant: 'tenant' \| 'advertiser'`, `data: Post \| AdvertiserPromotion` | Tenant variant: business info + offer title + expiry. Advertiser variant: "Local Business" label + headline + CTA button. |

### 2.3 Admin Components (`components/admin/`)

| Component | Props | Notes |
|-----------|-------|-------|
| **TenantRow** | `profile: Profile`, `business?: Business`, `onPress` | Row with Avatar, business name, email, StatusBadge. |
| **StatCard** | `label`, `value: number`, `icon?`, `onPress?` | Card displaying a stat number with label. Tappable for navigation. |
| **PropertySelector** | `propertyIds: string[]`, `selected`, `onSelect` | Dropdown/picker for admin screens. Fetches property names. |
| **CSVImporter** | `propertyId`, `onImport` | Web-only. File input + parse + validation table + import button. Platform.select() renders null on native. |

---

## 3. React Query Hooks (Phase 1b)

Build alongside or immediately after components.

| Hook | Query Key | Service Call | Notes |
|------|-----------|-------------|-------|
| `useBusinesses(propertyId, search?, category?)` | `['businesses', propertyId, { search, category }]` | `businessesService.filter()` | Debounced search handled by caller |
| `useBusiness(id)` | `['businesses', id]` | `businessesService.getById(id)` | Single business detail |
| `usePosts(propertyId, type?, excludeType?)` | `['posts', propertyId, { type, excludeType }]` | `postsService.filter({ property_id, type })` + client-side exclusion | Community tab passes `excludeType='offer'` to filter out offers; Promotions tab passes `type='offer'` to fetch only offers |
| `usePromotions(propertyId, segment)` | `['promotions', propertyId, segment]` | Merges posts (type='offer') + advertiser_promotions (approved) | Client-side merge + sort by date |
| `useAdvertiserPromotions(propertyId, status?)` | `['advertiserPromotions', propertyId, status]` | `advertiserPromotionsService.filter()` | For admin advertisers screen |
| `useTenants(propertyId, status?, search?)` | `['tenants', propertyId, { status, search }]` | `profilesService.listByProperty()` + client-side filter | Join with businesses by owner_email |
| `useProperties(propertyIds)` | `['properties', propertyIds]` | Fetch each via `propertiesService.getById()` | For admin property selector |
| `useAdminStats(propertyId)` | `['adminStats', propertyId]` | `adminService.getStats()` | Dashboard stats |

---

## 4. Tenant Screens (Phase 2)

### 4.1 Directory — `app/(tabs)/directory.tsx`

- GradientHeader: property name (from first propertyId)
- SearchBar below header (local state, 300ms debounce before query)
- CategoryChips: horizontal filter row
- FlatList of BusinessCard (compact variant)
- Data: `useBusinesses(propertyId, debouncedSearch, selectedCategory)`
- Pull-to-refresh, LoadingSkeleton while loading, EmptyState when no results

### 4.2 Directory Detail — `app/(tabs)/directory/[id].tsx`

- Pushed via `router.push(`/directory/${id}`)`
- Full-size Avatar, business name, category Badge
- Description (full text)
- Services list
- Contact section: unit number, phone, email, website
- Action buttons row:
  - Call → `Linking.openURL('tel:${phone}')`
  - Email → `Linking.openURL('mailto:${email}')`
  - Website → `Linking.openURL(url)`
  - Buttons hidden when field is null
- QR code section (`react-native-qrcode-svg`): encodes deep link `unit://directory/${id}`
- Share button → `expo-sharing` native share sheet (shares business name + contact info as text)
- "Edit Profile" button: visible only when `business.owner_email === user.email`, navigates to `/profile/edit`
- Data: `useBusiness(id)`

### 4.3 Profile — `app/(tabs)/profile.tsx`

Replace current placeholder with:
- Large BusinessCard (own business from `useCurrentUser()`)
- QR code section (same as directory detail, own business ID)
- Share button
- "Edit Profile" button → `router.push('/profile/edit')`
- Settings section:
  - Property info (property name, fetched from propertyIds)
  - App version (`expo-constants` → `Constants.expoConfig?.version`)
  - "Log Out" button (destructive variant, calls `logout()`)
- **No push toggle** (deferred to M3)

### 4.4 Profile Edit — `app/(tabs)/profile/edit.tsx`

- React Hook Form + Zod schema
- Fields: business_name (required), category (picker from BUSINESS_CATEGORIES, required), business_description (multiline), contact_name, contact_phone, contact_email (email validation), website (URL validation), services (multiline)
- Logo section: current logo preview + "Change Logo" button → `expo-image-picker` → `storageService.uploadFile()` → update `logo_url`
- Pre-populated from `useCurrentUser()` data
- Save → `businessesService.update(id, data)` → `queryClient.invalidateQueries(['businesses'])` → `router.back()`
- Cancel/hardware back discards unsaved changes

### 4.5 Promotions — `app/(tabs)/promotions.tsx`

- GradientHeader: "Promotions"
- SegmentedControl: "All" | "Tenant Offers" | "Local Deals"
- FlatList of PromotionCard (mixed variants)
- Data: `usePromotions(propertyId, segment)`
  - "All": merge posts (type='offer') + advertiser_promotions (approved, within start_date/end_date range), sorted by created_at desc
  - "Tenant Offers": posts only
  - "Local Deals": advertiser_promotions only
- FAB → `router.push('/promotions/create')`
- Pull-to-refresh, LoadingSkeleton, EmptyState per segment
- **No push trigger on create** (deferred to M3)

### 4.6 Create Offer — `app/(tabs)/promotions/create.tsx`

- React Hook Form + Zod
- Fields: title (required), description (multiline, required), expiry_date (date picker), image (optional, expo-image-picker)
- On submit:
  1. Upload image if selected → `storageService.uploadFile()`
  2. `postsService.create({ property_id, business_id, type: 'offer', title, content: description, expiry_date, image_url })`
  3. Invalidate promotions queries
  4. Toast success
  5. `router.back()`
- **Does NOT trigger push** (M3)

### 4.7 Community — `app/(tabs)/community.tsx`

- GradientHeader: "Community"
- SegmentedControl: "All" | "Announcements" | "Events"
- FlatList of PostCard
- Data: `usePosts(propertyId, typeFilter)`
  - "All": all posts EXCEPT type='offer' (offers live in Promotions tab)
  - "Announcements": type='announcement'
  - "Events": type='event'
- FAB → `router.push('/community/create')`
- Pull-to-refresh, LoadingSkeleton, EmptyState
- PostCard shows relative timestamp via `date-fns.formatDistanceToNow()`
- **No push trigger on create** (M3)

### 4.8 Create Post — `app/(tabs)/community/create.tsx`

- React Hook Form + Zod
- Fields: type (segmented: 'announcement' | 'event', required), title (required), content (multiline, required), event_date (date picker, visible when type='event'), event_time (time picker, visible when type='event'), image (optional)
- On submit: upload image if present → `postsService.create(...)` → invalidate → toast → back
- **Does NOT trigger push** (M3)

---

## 5. Admin Screens (Phase 3)

All under `app/(admin)/`. Protected by existing role gate in `(admin)/_layout.tsx`.

### 5.1 Dashboard — `(admin)/index.tsx`

Replace current placeholder with:
- PropertySelector at top (from `profile.property_ids`)
- StatCard row (single column on mobile, two-column on web via `Platform.select()`):
  - Total Tenants (count)
  - Active Accounts (status='active' count)
  - Pending Invites (status='invited' count)
  - Active Promotions (approved advertiser_promotions in last 30 days)
- "Pending Approvals" tappable row → navigates to `/(admin)/advertisers`
- Recent activity section: last 10 items from `posts` table (any type) for selected property, reverse chronological by `created_date`. Each row shows: post type badge, title, author email (from `business_id` join or `owner_email`), and relative timestamp. This is a simple recent-posts list, not a full activity log.
- Data: `useAdminStats(selectedPropertyId)` + `usePosts(propertyId)` (limit 10, no type filter) for recent activity

### 5.2 Tenants — `(admin)/tenants.tsx`

- PropertySelector
- SearchBar + status filter (SegmentedControl: All | Invited | Active | Inactive)
- FlatList of TenantRow
- Data: `useTenants(propertyId, statusFilter, search)` — profiles joined with businesses by owner_email
- Tap tenant → BottomSheet:
  - All business + profile fields displayed
  - "Edit" mode: inline form to update business fields
  - "Disable Account" toggle → `profilesService.disable(id)` or `profilesService.reactivate(id)`
  - "Resend Invite" button (visible when status='invited') → `adminService.inviteTenants([existingTenantData])`
- "Add Tenant" button → BottomSheet form:
  - Fields: email, business_name, category, contact_name, contact_phone, services
  - Submit → `adminService.inviteTenants([data])` → invalidate tenants query → toast result
- EmptyState when no tenants match filter

**Web-only features** (via `Platform.select()`):
- CSVImporter component:
  - `<input type="file" accept=".csv">`
  - Expected format: `email, business_name, category, contact_name, contact_phone, services`
  - Parse → validation table (green/red rows) → "Import [N] Tenants" button
  - Batch import: `adminService.inviteTenants()` in chunks of 25
  - Progress bar + result summary (imported / failed / total)
- "Export CSV" button → generate + download tenant list
- Mobile shows: "For bulk import, use the admin web panel"

### 5.3 Advertisers — `(admin)/advertisers.tsx`

- PropertySelector
- SegmentedControl: Pending | Approved | Rejected
- FlatList of PromotionCard (admin variant showing StatusBadge)
- Data: `useAdvertiserPromotions(propertyId, statusFilter)`
- Tap card → BottomSheet detail:
  - All fields: business name, type, headline, full description, image, CTA link (tappable), date range
  - Action buttons by status:
    - Pending → Approve / Reject
    - Approved → Revoke (sets to rejected)
    - Rejected → Approve
  - `advertiserPromotionsService.updateStatus(id, newStatus, currentUser.id)`
  - **Does NOT trigger push on approval** (M3)
  - Invalidate queries on success
- "Add Promotion" button → BottomSheet form:
  - Fields: business_name, business_type, contact_email, contact_phone, headline, description, image_url, cta_link, cta_text, start_date, end_date
  - Admin-created promotions auto-approved: `approval_status: 'approved'`, `approved_by: currentUser.id`

### 5.4 Properties — `(admin)/properties.tsx`

- FlatList of property cards: name, address, city/state, total_units, tenant count
- Data: `useProperties(profile.property_ids)` + tenant count from `useTenants` or stats
- Tap → BottomSheet edit form:
  - Fields: name, address, city, state, type, total_units, image_url
  - Save → `propertiesService.update(id, data)` → invalidate
- "Add Property" button → BottomSheet create form:
  - Same fields
  - Submit → `propertiesService.create(data)` → `adminService.addPropertyToAdmin(newId)` → invalidate

---

## 6. Navigation Changes

### Tab Layout Update (`app/(tabs)/_layout.tsx`)

Add conditional admin tab:
```tsx
{isAdmin && (
  <Tabs.Screen name="admin" options={{
    title: 'Admin',
    tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
  }} />
)}
```

Create `app/(tabs)/admin.tsx` that redirects to `/(admin)/` stack using `router.replace('/(admin)/')`.

### Admin Stack Navigation (`app/(admin)/_layout.tsx`)

Add Stack.Screen entries for each admin screen if not already present.

### Notifications Tab

Remains as "Coming in Milestone 3" placeholder. No changes.

---

## 7. Explicitly Out of Scope (Deferred to M3)

Per the milestone breakdown in the parent spec (Section 14):

- Notifications tab (entire screen — inbox, badges, mark read, deep links)
- Admin Push screen (compose, send, history)
- Push notification triggers on post/offer/advertiser creation or approval
- Push token registration/permissions (expo-notifications integration)
- useUnreadCount() hook + tab badge count
- Push notification toggle in Profile settings
- send-push-notification Edge Function
- Victory-native charts for admin dashboard
- E2E tests, app store builds, UI polish pass

---

## 8. Implementation Phases

| Phase | Scope | Deliverables |
|-------|-------|-------------|
| **Phase 0** | M1 fixes | 9 bug fixes (auth, schema, services, config, navigation) |
| **Phase 1** | Shared components + hooks | ~15 UI components + ~8 React Query hooks |
| **Phase 2** | Tenant screens | 8 screens (directory, detail, profile, edit, promotions, create offer, community, create post) |
| **Phase 3** | Admin screens | 4 screens (dashboard, tenants, advertisers, properties) + CSV importer |
| **Phase 4** | Integration | Admin tab wiring, cross-screen navigation, query invalidation verification |
