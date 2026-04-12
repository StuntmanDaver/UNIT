# UNIT Expo/React Native Mobile Rebuild — Design Spec

**Date:** 2026-04-04
**Delivery Deadline:** May 1, 2026
**Contract Reference:** UNIT App Development Proposal and Agreement (CULTR Ventures LLC)
**Scope:** Cross-platform mobile app (iPhone + Android) with web admin panel

---

## 1. Executive Summary

This spec defines the complete rebuild of UNIT from a React web SPA to an Expo/React Native cross-platform mobile app. The existing Supabase backend (database, auth, RLS, Edge Functions) is retained. The web frontend is archived and replaced with a mobile-first Expo project targeting iOS and Android app store delivery, with a web export for the admin panel.

The MVP focuses on one core use case: help tenants inside a commercial property discover, connect with, and promote services to other tenants in that same property.

### Key Decisions

| Decision | Choice |
|----------|--------|
| Repo strategy | Replace — archive web app (`v1-web-archive` tag), fresh Expo in same repo |
| UI library | Custom components + NativeWind (Tailwind for React Native) |
| Navigation | Expo Router v4 (file-based routing) |
| Admin surface | Single codebase — both in-app mobile admin tab + web admin via `expo export:web`, platform-conditional screens |
| Push notifications | Expo Push Notifications (EAS) — single API for APNs + FCM |
| Advertiser promotions | Separate `advertiser_promotions` table (not reusing `ads` or `posts`) |
| Tenant auth | Email/password with forced password reset on first login |
| Admin must-haves | All 8: CSV import, manual add, tenant list/status, approve/reject advertisers, send push, edit/disable tenants, manage properties, usage stats |
| Architecture | Single Expo app with `Platform.select()` for admin web enhancements |
| Database | Same Supabase project, one new migration (`006_mobile_mvp.sql`) |
| Language | TypeScript (strict mode) |

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 53 |
| Language | TypeScript (strict) |
| Routing | Expo Router v4 (file-based) |
| Styling | NativeWind v4 (Tailwind for RN) |
| State/Data | TanStack React Query v5 |
| Forms | React Hook Form + Zod |
| Backend | Supabase JS v2 (`@supabase/supabase-js`) |
| Auth storage | `@react-native-async-storage/async-storage` |
| Push | `expo-notifications` + Expo Push API |
| Icons | `lucide-react-native` |
| Charts | `victory-native` |
| Dates | `date-fns` |
| QR codes | `react-native-qrcode-svg` |
| Gradients | `expo-linear-gradient` |
| Bottom sheets | `@gorhom/bottom-sheet` |
| Toasts | `react-native-toast-message` |
| Image picker | `expo-image-picker` |
| Sharing | `expo-sharing` |
| Build/Deploy | EAS Build (iOS/Android) + `expo export:web` (admin) |
| E2E testing | Maestro |
| Unit testing | Jest + React Native Testing Library |
| CI | GitHub Actions (lint, typecheck, test) |

---

## 3. Project Structure

```
/
  app/                          # Expo Router pages
    _layout.tsx                 # Root layout: providers, auth guard, splash
    (auth)/
      _layout.tsx               # Auth stack layout
      login.tsx                 # Email + password login
      signup.tsx                # Self-registration
      reset-password.tsx        # Forced reset + forgot password
      onboarding.tsx            # Property selection + business profile wizard
    (tabs)/
      _layout.tsx               # Bottom tab bar layout
      directory.tsx             # Browse tenant businesses
      directory/[id].tsx        # Business detail screen
      promotions.tsx            # Combined tenant offers + local deals feed
      promotions/create.tsx     # Create offer form
      community.tsx             # Announcements + events feed
      community/create.tsx      # Create post form
      notifications.tsx         # Notification inbox
      profile.tsx               # Own business card + settings
      profile/edit.tsx          # Edit business profile
    (admin)/
      _layout.tsx               # Admin stack layout (role-gated)
      index.tsx                 # Dashboard / stats
      tenants.tsx               # Tenant list + add + CSV import (web)
      advertisers.tsx           # Approve/reject advertiser promotions
      properties.tsx            # Manage properties
      push.tsx                  # Send push notifications
  components/
    ui/                         # Primitives: Button, Input, Card, Badge, Modal, etc.
    tenant/                     # Tenant-specific: BusinessCard, PromotionCard, PostCard, etc.
    admin/                      # Admin-specific: TenantRow, CSVImporter, StatCard, etc.
  services/                     # Supabase service layer
    supabase.ts                 # Client singleton with AsyncStorage adapter
    properties.ts               # Properties CRUD
    businesses.ts               # Businesses CRUD
    posts.ts                    # Posts CRUD
    notifications.ts            # Notifications CRUD + getUnreadCount
    storage.ts                  # File upload (adapted for expo-image-picker)
    advertiser-promotions.ts    # Advertiser promotions CRUD + status updates
    profiles.ts                 # Profiles CRUD + listByProperty + disable
    push.ts                     # Push token registration
    admin.ts                    # Edge Function wrappers (invite, push, etc.)
  lib/
    AuthContext.tsx              # Auth state + role detection + password change flag
    query-client.ts             # TanStack Query config
  constants/
    colors.ts                   # Brand palette, status colors, category colors
    categories.ts               # Business category definitions
  hooks/
    useCurrentUser.ts           # Current user's business profile
    usePushNotifications.ts     # Push token lifecycle + notification handlers
    useUnreadCount.ts           # Notification badge count
    usePropertyTenants.ts       # Admin: tenant list for a property
  assets/
    icon.png                    # 1024x1024 app icon
    splash.png                  # Splash screen
    adaptive-icon.png           # Android adaptive icon
    notification-icon.png       # Push notification icon
    favicon.png                 # Web favicon
  supabase/
    migrations/                 # Database migrations (unchanged + new)
      001_initial_schema.sql
      002_units_table.sql
      003_landlord_auth.sql
      004_auto_profile_creation.sql
      005_financial_workflows.sql
      006_mobile_mvp.sql        # New: profiles columns + advertiser_promotions table
    functions/
      invite-tenant/index.ts    # New: bulk tenant creation + invite emails
      send-push-notification/index.ts  # New: Expo Push API delivery
      complete-onboarding/index.ts     # New: self-registration property assignment + status activation
      add-property-to-admin/index.ts   # New: property_ids array update
      send-invoice-email/index.ts      # Existing (dormant)
      mark-overdue-invoices/index.ts   # Existing (dormant)
      mark-escalated-requests/index.ts # Existing (dormant)
  scripts/
    seed-landlord.sql           # Promote user to admin/landlord role
  docs/                         # Reference documentation
  .github/
    workflows/
      ci.yml                    # Lint, typecheck, test
```

---

## 4. Database Schema Changes

### Existing Tables (Unchanged — Used by Mobile App)

| Table | Mobile App Usage |
|-------|-----------------|
| `properties` | Property listing, selection, admin management |
| `businesses` | Tenant profiles, directory, search |
| `posts` | Tenant-to-tenant promotions, announcements, events |
| `notifications` | In-app notification inbox |
| `profiles` | Auth state, roles, push tokens (extended — see migration) |
| `activity_logs` | Usage tracking |

### Existing Tables (Unchanged — Dormant in Mobile V1)

| Table | Reason Deferred |
|-------|----------------|
| `leases` | Landlord accounting — excluded from contracted MVP |
| `recurring_payments` | Landlord accounting — excluded |
| `invoices` | Landlord accounting — excluded |
| `expenses` | Landlord accounting — excluded |
| `payments` | Landlord accounting — excluded |
| `audit_log` | Audit-heavy admin — excluded |
| `units` | Unit management — excluded |
| `ads` | Superseded by `advertiser_promotions` |
| `recommendations` | Request/work order system — excluded |

These tables remain in the database with no destructive migrations. They don't interfere with the mobile app and will be available if these features are added in future versions.

### New Migration: `006_mobile_mvp.sql`

```sql
-- 1. Extend profiles for mobile onboarding and push notifications
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text,
  ADD COLUMN IF NOT EXISTS needs_password_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'invited'
    CHECK (status IN ('invited', 'active', 'inactive'));

-- 2. Advertiser promotions table
CREATE TABLE advertiser_promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  business_name text NOT NULL,
  business_type text,
  contact_email text,
  contact_phone text,
  headline text NOT NULL,
  description text,
  image_url text,
  cta_link text,
  cta_text text,
  approval_status text DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES auth.users(id),
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS for advertiser_promotions
ALTER TABLE advertiser_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants read approved advertiser promotions"
  ON advertiser_promotions FOR SELECT
  USING (approval_status = 'approved');

CREATE POLICY "Admins manage advertiser promotions"
  ON advertiser_promotions FOR ALL
  USING (is_landlord() AND property_id = ANY(landlord_property_ids()));

-- 4. Indexes
CREATE INDEX idx_profiles_push_token
  ON profiles(push_token) WHERE push_token IS NOT NULL;

CREATE INDEX idx_advertiser_promotions_property_status
  ON advertiser_promotions(property_id, approval_status);
```

### Role Mapping

| Proposal Term | Database Role | Capabilities |
|---------------|--------------|-------------|
| Tenant user | `tenant` | Browse directory, manage own profile, post promotions, receive notifications |
| Admin | `landlord` | All tenant capabilities + manage tenants, approve advertisers, send push, manage properties, view stats |

The existing `is_landlord()` and `landlord_property_ids()` PostgreSQL functions are reused for admin RLS enforcement.

---

## 5. Authentication & Onboarding

### Flow 1: Admin-Invited Tenant (Primary Path)

```
Admin imports CSV or adds tenant manually
  -> Edge Function `invite-tenant`:
    1. supabase.auth.admin.createUser({ email, password: tempPassword })
    2. INSERT profiles (role='tenant', status='invited', needs_password_change=true, property_ids=[propertyId])
    3. INSERT businesses (owner_email, property_id, business_name, category -- from CSV)
    4. Send invite email via Resend with temp credentials + app download link

Tenant receives email
  -> Downloads app
  -> Login: enters email + temp password
  -> Auth succeeds
  -> App checks profiles.needs_password_change === true
  -> Forced redirect to reset-password screen
  -> Tenant sets new password via supabase.auth.updateUser({ password })
  -> App updates profiles: needs_password_change=false, status='active', activated_at=now()
  -> Redirect to profile edit (pre-populated from CSV data, tenant can refine)
  -> Tenant lands on directory tab
```

### Flow 2: Self-Registration (Secondary Path)

```
Tenant downloads app
  -> Sign Up: email, password, confirm password
  -> supabase.auth.signUp({ email, password })
  -> Auto-trigger creates profiles row (role='tenant', status='invited' — default)
  -> Onboarding wizard:
    1. Select property (searchable list)
    2. Create business profile (name, category, description, contact, services)
    3. Optional logo upload
  -> On onboarding complete:
    - Edge Function `complete-onboarding` sets profiles.property_ids=[propertyId],
      profiles.status='active', profiles.activated_at=now()
    - (Uses service_role to safely update property_ids — same pattern as add-property-to-admin)
  -> Tenant lands on directory tab
```

**Note:** The existing auto-trigger (`004_auto_profile_creation.sql`) creates profiles with default column values. After `006_mobile_mvp.sql`, new profiles will get `status='invited'` by default. Self-registering users get upgraded to `status='active'` on onboarding completion via the `complete-onboarding` Edge Function. This also solves the `property_ids` update, which cannot be done client-side due to RLS restrictions.

### Flow 3: Admin Login

```
Admin opens app
  -> Login: email + password
  -> Auth succeeds
  -> App fetches profiles row, detects role='landlord'
  -> Bottom tab bar includes Admin tab (hidden for tenants)
```

### Auth State

```typescript
type AuthState = {
  user: User | null
  profile: Profile | null
  isAuthenticated: boolean
  isLoading: boolean
  isAdmin: boolean               // profile.role === 'landlord'
  needsPasswordChange: boolean   // profile.needs_password_change
  needsOnboarding: boolean       // no business record for this email
}
```

### Route Protection (Root Layout)

```
if isLoading -> splash screen
if !isAuthenticated -> (auth)/login
if needsPasswordChange -> (auth)/reset-password
if needsOnboarding -> (auth)/onboarding
if authenticated -> (tabs) layout, (admin) tab visible only if isAdmin
```

### Session Persistence

Supabase JS client configured with `AsyncStorage` adapter. Sessions persist across app restarts. Token refresh handled automatically. `detectSessionInUrl: false` — deep links handled by Expo Router.

### Password Reset (Forgot Password)

Login screen "Forgot password?" link calls `supabase.auth.resetPasswordForEmail(email)`. Supabase sends reset email. Link deep-links back into app. User sets new password.

---

## 6. Tenant Screens

### Tab 1: Directory

- Header: property name + search bar
- Category filter: horizontal scrollable chips
- Business card list: logo/initials, name, category badge, description (2-line), unit number
- Tap card -> business detail screen:
  - Full profile display
  - Action buttons: Call, Email, Website (native deep links)
  - QR code (`react-native-qrcode-svg`)
  - Share button (native share sheet via `expo-sharing`)
  - "Edit Profile" if viewing own business

### Tab 2: Promotions

- Segmented control: "All" | "Tenant Offers" | "Local Deals"
- Tenant offer cards: business logo/name, offer title, description, expiry date, category badge
  - Source: `posts` table where `type = 'offer'`
- Advertiser promotion cards: "Local Business" label, business name/type, headline, description, CTA button
  - Source: `advertiser_promotions` where `approval_status = 'approved'` and within date range
- FAB: "Post an Offer" -> create offer form (title, description, expiry, image)
  - Creates `posts` row with `type = 'offer'`
  - Triggers push notification to property tenants

### Tab 3: Community

- Post type filter: "All" | "Announcements" | "Events"
- Post cards: business logo/name, type badge, title, content preview, event date/time if applicable
- FAB: "New Post" -> create form (type selector, title, content, date/time for events, optional image)
  - Creates `posts` row
  - Triggers push notification

### Tab 4: Notifications

- Reverse-chronological list from `notifications` table (user_email + property_id)
- Each: icon by type, title, message preview, timestamp, unread indicator
- Tap -> deep link to related content
- "Mark all read" in header
- Badge count on tab icon

### Tab 5: Profile

- Own business card display: logo, name, category, description, services, contact info, QR code, share button
- "Edit Profile" -> edit form with all business fields, logo upload via `expo-image-picker`
- Settings section: push notification toggle, property info, logout, app version

---

## 7. Admin Screens

Visible only when `profile.role === 'landlord'`. On mobile, appears as Admin tab. On web, same screens with richer layouts via `Platform.select()`.

### Dashboard (`(admin)/index.tsx`)

- Property selector (dropdown if multiple properties)
- Stats cards: total tenants, active accounts, pending invites, active promotions (30 days)
- Pending approvals count with link to advertisers screen
- Recent activity timeline (last 10 events)
- Platform difference: mobile = single column; web = two-column grid

### Tenants (`(admin)/tenants.tsx`)

**Shared (mobile + web):**
- Property selector
- Tenant list with status badges (invited=yellow, active=green, inactive=gray)
- Search + status filter
- Tap tenant -> detail/edit sheet:
  - View all fields
  - Edit business profile
  - "Disable Account" toggle (sets `profiles.status = 'inactive'`)
  - "Resend Invite" button (for invited status)
- "Add Tenant" button -> form: email, business name, category, contact info, services
  - Calls `invite-tenant` Edge Function

**Web-only (via `Platform.select()`):**
- CSV Import panel:
  - File input (`<input type="file" accept=".csv">`)
  - Expected format: `email, business_name, category, contact_name, contact_phone, services`
  - Upload & Preview: parse CSV, show validation table
  - Invalid rows highlighted with error message
  - "Import [N] Tenants" button -> batch call to `invite-tenant` Edge Function (batches of 25)
  - Progress indicator + result summary
- Export button: download tenant list as CSV

**Mobile CSV alternative:**
- Message: "For bulk import, use the admin web panel at [url]"

### Advertisers (`(admin)/advertisers.tsx`)

- Property selector
- Tab bar: Pending | Approved | Rejected
- Promotion cards: business name, type, headline, description preview, date range, image thumbnail, status badge
- Tap card -> full detail view:
  - All fields + full image + tappable CTA link
  - Action buttons: Approve/Reject (pending), Revoke (approved), Approve (rejected)
  - Updates `advertiser_promotions.approval_status` + sets `approved_by`
  - Approval triggers push to property tenants
- "Add Promotion" button -> form for admin to create on behalf of advertiser
  - Admin-created promotions are auto-approved

### Properties (`(admin)/properties.tsx`)

- List of admin's managed properties (from `profiles.property_ids`)
- Each card: name, address, city/state, total units, tenant count
- Tap -> edit screen (name, address, city, state, type, total units, image URL)
- "Add Property" button -> create form
  - Inserts into `properties`, then calls `add-property-to-admin` Edge Function to update admin's `property_ids`

### Push Notifications (`(admin)/push.tsx`)

- Property selector
- Compose form: title (max 50 chars), message (max 200 chars), audience (All Tenants / Active Only)
- Preview card
- "Send" button -> calls `send-push-notification` Edge Function
- Sent history list below compose form

---

## 8. Service Layer

### Ported Services (from web `src/services/`)

| Service | File | Changes from Web |
|---------|------|-----------------|
| Supabase Client | `services/supabase.ts` | AsyncStorage adapter, `detectSessionInUrl: false` |
| Properties | `services/properties.ts` | Add `create()`, `update()` for admin |
| Businesses | `services/businesses.ts` | No changes |
| Posts | `services/posts.ts` | No changes |
| Notifications | `services/notifications.ts` | Add `getUnreadCount()` |
| Storage | `services/storage.ts` | Adapt for `expo-image-picker` URI format |

### New Services

| Service | File | Methods |
|---------|------|---------|
| Advertiser Promotions | `services/advertiser-promotions.ts` | `filter()`, `getById()`, `create()`, `updateStatus()` |
| Profiles | `services/profiles.ts` | `getCurrent()`, `update()`, `listByProperty()`, `disable()`, `reactivate()` |
| Push | `services/push.ts` | `registerToken()`, `unregisterToken()` |
| Admin | `services/admin.ts` | `inviteTenants()`, `sendPush()`, `getStats()` |

### Dropped Services (dormant in V1)

`accounting.ts`, `units.ts`, `activityLogs.ts`, `AuditLogger.ts`

### Supabase Client Config

```typescript
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### React Query Config

```typescript
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min (longer than web for mobile caching)
      gcTime: 1000 * 60 * 10,          // 10 min garbage collection
      retry: 2,                         // Retry twice (mobile connectivity)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,         // Refetch when network returns
    },
  },
})
```

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useCurrentUser()` | Fetches current user's business profile (replaces duplicated pattern from 5+ web pages) |
| `usePushNotifications()` | Push permission, token registration, notification listeners |
| `useUnreadCount()` | Notification badge count (polls every 30s) |
| `usePropertyTenants(propertyId)` | Admin: tenant list for a property |

---

## 9. Push Notifications

### Token Lifecycle

```
App launch (authenticated) -> getPermissionsAsync()
  -> If not granted: requestPermissionsAsync()
  -> If granted: getExpoPushTokenAsync({ projectId })
  -> Store in profiles.push_token if changed
User logout -> Clear profiles.push_token
User disables in settings -> Clear profiles.push_token
```

### Notification Triggers

| Event | Recipients | Title Format |
|-------|-----------|-------------|
| New tenant offer | Property tenants (excl. author) | "[Business Name] posted an offer" |
| New announcement | Property tenants (excl. author) | "New announcement from [Business Name]" |
| New event | Property tenants (excl. author) | "[Business Name] is hosting an event" |
| Advertiser approved | Property tenants | "New local deal from [Business Name]" |
| Admin broadcast | Selected audience | Custom title |
| Welcome | Activated tenant only | "Welcome to UNIT" |

### Dual Delivery

Every push is also written to the `notifications` table. The Notifications tab is the complete record regardless of push delivery.

### Deep Linking on Tap

Notification tap navigates to related content based on `data.type` field: post detail, promotion detail, or notifications inbox.

### Foreground Handling

Notifications show as banners when app is open. Badge count updates. Sound suppressed when in-app.

---

## 10. Edge Functions

### New: `invite-tenant`

- **Trigger:** Admin action (HTTP POST)
- **Auth:** Requires `role = 'landlord'`. Uses `SUPABASE_SERVICE_ROLE_KEY` for `auth.admin.createUser()`
- **Input:** Array of `{ email, business_name, category, contact_name?, contact_phone?, services?, description?, property_id }`
- **Process per tenant:**
  1. Validate email + required fields
  2. Check for existing account (skip if exists)
  3. Generate temp password (`crypto.randomUUID().slice(0, 12)`)
  4. Create auth user with `email_confirm: true`
  5. Insert profiles row (status='invited', needs_password_change=true)
  6. Insert businesses row with provided data
  7. Send invite email via Resend
- **Output:** `{ imported: number, failed: Array<{ email, reason }>, total: number }`
- **Batch handling:** Sequential batches of 10 to respect rate limits
- **Rollback:** If any step fails for a tenant, delete the auth user if created, add to failed list

### New: `send-push-notification`

- **Trigger:** Admin broadcast or auto-trigger after post/offer creation
- **Auth:** Requires authenticated user
- **Input:** `{ property_id, title, message, data?, audience?, exclude_email? }`
- **Process:**
  1. Query profiles with push_token for target property + audience filter
  2. Build Expo push messages
  3. Batch send to `https://exp.host/--/api/v2/push/send` (chunks of 100)
  4. Insert notification records for all recipients
- **Output:** `{ sent: number, failed: number }`

### New: `complete-onboarding`

- **Trigger:** Self-registering tenant completes onboarding wizard
- **Auth:** Requires authenticated user
- **Input:** `{ property_id }`
- **Process (using service_role):**
  1. Update caller's profiles row: `property_ids = [property_id]`, `status = 'active'`, `activated_at = now()`
  2. Return success
- **Why Edge Function:** `property_ids` and `status` cannot be set client-side due to RLS restrictions on the profiles table. This follows the same pattern as `add-property-to-admin`.

### New: `add-property-to-admin`

- **Trigger:** Admin creates new property
- **Auth:** Requires `role = 'landlord'`
- **Process:** `array_append(property_ids, new_property_id)` on caller's profiles row using service_role
- **Input:** `{ property_id }`

### Existing (Dormant)

`send-invoice-email`, `mark-overdue-invoices`, `mark-escalated-requests` — continue running against the same Supabase project. They operate on deferred tables and don't affect the mobile app.

### Edge Function Secrets

```
SUPABASE_SERVICE_ROLE_KEY    # For auth.admin.createUser()
RESEND_API_KEY               # For invite emails
RESEND_FROM_EMAIL            # "UNIT <noreply@domain.com>"
```

---

## 11. Brand & Design System

### Brand Palette

| Token | Name | Hex | RGB |
|-------|------|-----|-----|
| `brand-navy` | Dark Navy | `#101B29` | 16, 27, 41 |
| `brand-navy-light` | Deep Blue | `#1D263A` | 29, 38, 58 |
| `brand-blue` | Slate Blue | `#465A75` | 70, 90, 117 |
| ~~`brand-slate`~~ | ~~(duplicate)~~ | ~~`#465A75`~~ | ~~(same as brand-blue — remove alias to avoid confusion)~~ |
| `brand-steel` | Light Steel Blue | `#7C8DA7` | 124, 141, 167 |
| `brand-gray` | Soft Light Gray | `#E0E1DE` | 224, 225, 222 |

### Brand Assets

- **Logo:** Four connected human figures in square formation, navy-to-steel-blue gradient
- **Tagline:** "Where Tenants Connect"
- **App icon:** Logo on `#101B29` background, 1024x1024
- **Splash:** `#101B29` background, centered logo, tagline below

### NativeWind Tailwind Config

Brand colors registered as `brand-navy`, `brand-navy-light`, `brand-blue`, `brand-steel`, `brand-gray` in `tailwind.config.js`. The legacy `brand-slate` alias (identical to `brand-blue` at `#465A75`) is not carried forward — use `brand-blue` instead. Usage: `className="bg-brand-navy text-brand-gray"`.

### Semantic Colors

```typescript
// constants/colors.ts
STATUS_COLORS: invited=amber, active=green, inactive=gray, pending=amber, approved=green, rejected=red
CATEGORY_COLORS: per business category (restaurant=red, accounting=blue, legal=purple, etc.)
```

### Typography

"Arcadia Text" is the custom font used globally (`font-arcadia` class in Tailwind). NativeWind handles type scale via Tailwind classes (`text-sm`, `text-xl`, etc.).

### Gradient Headers

`expo-linear-gradient` for the brand navy-to-blue gradient headers. `GradientHeader` component wraps header content.

### Core UI Components

| Component | Purpose |
|-----------|---------|
| `Button` | Primary, secondary, destructive, ghost variants with Pressable |
| `Input` | TextInput wrapper with label + error state |
| `Card` | Content container with shadow + rounded corners |
| `Badge` | Status pills, category tags |
| `Avatar` | Business logo or initials fallback |
| `Modal` | Confirmation dialogs, forms |
| `BottomSheet` | Detail views, edit forms (`@gorhom/bottom-sheet`) |
| `Toast` | Success/error feedback (`react-native-toast-message`) |
| `SearchBar` | TextInput with search icon + clear |
| `CategoryChips` | Horizontal scrollable filter chips |
| `EmptyState` | No-content placeholder with icon + message |
| `LoadingSkeleton` | Animated loading placeholders |
| `GradientHeader` | Brand gradient header bar |
| `StatusBadge` | Tenant/promotion status pills |
| `FAB` | Floating action button |

---

## 12. Build, Deploy & Release

### EAS Build Profiles

- **development:** Dev client, internal distribution, simulator builds
- **preview:** Internal distribution for stakeholder testing
- **production:** Auto-increment version, signed for store submission

### Deploy Targets

| Target | Method | Timeline |
|--------|--------|----------|
| iOS App Store | `eas build --platform ios` + `eas submit --platform ios` | Submit by April 25 |
| Google Play Store | `eas build --platform android` + `eas submit --platform android` | Submit by April 25 |
| Web Admin Panel | `npx expo export --platform web` -> Vercel/Netlify | Deploy anytime |

### OTA Updates

Post-launch non-native changes pushed via `eas update` — no store review needed for UI fixes, new screens, or service layer changes.

### CI/CD (GitHub Actions)

Lint + typecheck + test on push/PR. Mobile builds via EAS Build (cloud). Web deploy via Vercel/Netlify GitHub integration.

### Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Jest | Services, utilities, hooks |
| Component | React Native Testing Library | Screen rendering, interactions, validation |
| E2E | Maestro | 6 critical user flows |

### Critical E2E Paths

1. Invited tenant: invite -> login -> forced reset -> directory
2. Self-registration: signup -> onboarding -> profile -> directory
3. Create offer: promotions -> create -> verify in feed -> push sent
4. Admin CSV import: upload -> preview -> import -> tenants created
5. Admin approve advertiser: create -> approve -> visible in tenant feed
6. Push broadcast: compose -> send -> delivery count -> in notifications tab

### App Store Requirements

- Apple Developer Account ($99/year) — client
- Google Play Developer Account ($25 one-time) — client
- Privacy policy URL — client provides or we draft
- App store screenshots, description, keywords
- Data safety declarations

---

## 13. Monetization-Ready Architecture

No monetization code ships in V1. The architecture is designed so future monetization is additive (new columns, new tables, new screens) — not destructive rewrites.

### Extension Points

| Revenue Model | V1 Hook | Future Path |
|---------------|---------|-------------|
| Paid advertiser placements | `advertiser_promotions` table with approval flow | Add payment step before approval. Stripe Checkout. |
| Sponsored tenant posts | `posts` table | Add `is_sponsored` flag. Pay to boost. |
| Premium business profiles | `businesses.is_featured` | Add `tier` column. Gate features behind tier. |
| Transaction fees on deals | `advertiser_promotions.cta_link` | In-app redemption flow. Take percentage. |
| Property subscriptions | `properties` table | Add `subscription_tier`. Gate admin features. |
| Coupon redemption tracking | Promotions in feed | Add `promotion_redemptions` table. |

### Future Schema Extensions (Not Built in V1)

```sql
-- When monetization activates:
ALTER TABLE advertiser_promotions ADD COLUMN placement_type text DEFAULT 'standard';
ALTER TABLE advertiser_promotions ADD COLUMN price_cents integer;
ALTER TABLE advertiser_promotions ADD COLUMN stripe_payment_id text;
ALTER TABLE businesses ADD COLUMN stripe_customer_id text;
ALTER TABLE posts ADD COLUMN is_sponsored boolean DEFAULT false;
CREATE TABLE subscriptions (...);
```

---

## 14. Milestone Breakdown

### Milestone 1: Foundation (April 4-11) — 8 days

*Contract: "Auth setup, tenant import structure, preload strategy, onboarding flow, invite flow, and first-login password setup." Payment: $1,000 deposit.*

**Week 1a (April 4-7):**
- Archive web app (tag + strip)
- Initialize Expo project (SDK 53, TypeScript, Expo Router, NativeWind)
- Configure Supabase client with AsyncStorage
- Build auth screens (login, signup, reset-password)
- Build AuthContext with role detection + password change flag
- Build root layout with auth guard routing
- Run migration `006_mobile_mvp.sql`

**Week 1b (April 8-11):**
- Build onboarding wizard (property selection, business profile, logo upload)
- Port storage service for expo-image-picker
- Build Edge Function `invite-tenant`
- Build Edge Function `add-property-to-admin`
- Set up Resend with invite email template
- E2E test: invite -> login -> forced reset -> onboarding -> directory

### Milestone 2: Core MVP (April 12-22) — 11 days

*Contract: "Tenant business profiles, property-based directory, internal promotions feed, and local advertiser promotion structure in working form." Payment: $4,000.*

**Week 2 (April 12-16):**
- Bottom tab navigation layout
- Directory screen (search, category chips, business cards)
- Business detail screen (full profile, actions, QR, share)
- Profile tab (own card, edit, settings, logout)
- Port services: properties, businesses, notifications, posts

**Week 3a (April 17-19):**
- Promotions tab (combined feed, segmented control)
- Create offer flow
- Community tab (announcements + events, type filter)
- Create post flow
- Advertiser promotion service + card rendering

**Week 3b (April 20-22):**
- Admin tab layout (role-gated)
- Admin dashboard (stats, pending approvals, activity)
- Tenants screen (list, add, edit, disable, CSV import on web)
- Advertisers screen (pending/approved/rejected, approve/reject, create)
- Properties screen (list, add, edit)

### Milestone 3: Completion & Release (April 23-May 1) — 9 days

*Contract: "Push notifications, admin upload/import tool, future-ready monetization hooks, QA, refinement, and final handoff." Payment: $4,999.*

**Week 4a (April 23-25):**
- Integrate expo-notifications (permissions, token registration, handlers)
- Build Edge Function `send-push-notification`
- Wire push triggers (post creation, advertiser approval)
- Notifications tab (inbox, badges, mark read, deep link)
- Admin push screen (compose, send, history)
- App store assets (icon, splash, screenshots) — prepare in parallel
- EAS production builds (iOS + Android) — trigger by April 25
- Submit to App Store + Play Store by April 25 (6-day buffer for review)

**Week 4b (April 26-28):**
- Monetization architecture review + documentation
- UI polish pass (spacing, colors, loading skeletons, empty states, error states)
- Testing (unit tests, component tests, Maestro E2E for 6 critical paths)
- Deploy web admin to Vercel/Netlify

**Week 4c (April 29-May 1):**
- Final QA on physical devices
- Address any App Store / Play Store review feedback
- Documentation (updated PRD, deployment runbook, Edge Function docs)
- Final handoff

### Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| App Store rejection | Submit April 25 (6-day buffer). Prepare review notes + demo credentials. |
| SDK compatibility issues | Pin exact versions. Run `expo doctor` before building. |
| CSV import edge cases | Limit 500 tenants per import. Validate in preview. Per-row error reporting. |
| Push permission denial | App fully functional without push. Notifications tab as fallback. |

---

## 15. Repo Transition Steps

1. Tag current state: `git tag v1-web-archive`
2. Remove web files: `src/`, `public/`, `vite.config.js`, `postcss.config.js`, `tailwind.config.js`, `eslint.config.js`, `jsconfig.json`, `index.html`, `package.json`, `package-lock.json`, `playwright.config.js`, `playwright-report/`, `test-results/`, `tests/`
3. Keep: `supabase/`, `docs/`, `.git/`, `scripts/`, `.planning/`
4. Initialize Expo: `npx create-expo-app@latest . --template blank-typescript`
5. Install dependencies (per Section 2 stack)
6. Configure TypeScript, NativeWind, Tailwind with brand tokens
7. Create directory structure (`app/`, `components/`, `services/`, `lib/`, `constants/`, `hooks/`)
8. Port service layer from `v1-web-archive` tag (convert JS -> TS, add AsyncStorage adapter)
9. Verify: `npx expo start` on iOS simulator + web + `npx tsc --noEmit`

### Environment Variables

```
# .env (Expo)
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
EXPO_PUBLIC_APP_URL=https://<production-domain>

# Edge Function secrets (supabase secrets set)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
RESEND_API_KEY=re_<key>
RESEND_FROM_EMAIL=UNIT <noreply@domain.com>
```

---

## 16. Out of Scope (V1)

Explicitly excluded per the signed proposal agreement:

- Desktop-first workflows
- Landlord accounting (invoices, leases, expenses, payments, financial reports)
- Audit-heavy admin systems
- Complex finance features (Stripe payments, transaction systems)
- Advanced scaling logic (multi-region, nationwide)
- Unit management
- Recommendation/work order system
- SLA tracking
- Full map/CAD floor plans
- Email/SMS notification delivery (push + in-app only for V1)
- Multi-user tenant roles (one profile per business for V1)
- Advertiser self-service portal (admin creates on their behalf for V1)

These features remain in the database schema (no destructive migrations) and can be activated in future versions.
