# Phase 0: M1 Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 9 bugs and gaps discovered during M1 audit before starting Milestone 2 screen work.

**Architecture:** Direct fixes to existing files — no new patterns introduced. One new database migration for schema gaps. All fixes are independent and can be committed individually.

**Tech Stack:** TypeScript, Supabase, Expo Router, React Hook Form, Deno (Edge Functions)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `app/(auth)/login.tsx` | Fix forgot password handler |
| Create | `supabase/migrations/007_m2_schema_fixes.sql` | Add notifications.data column + posts type constraint |
| Modify | `services/businesses.ts` | Add text search to filter() |
| Modify | `services/posts.ts` | Add getById(), update(), delete() |
| Modify | `constants/colors.ts` | Add 6 missing CATEGORY_COLORS |
| Modify | `services/admin.ts` | Fix getStats() to query advertiser_promotions |
| Modify | `app/(tabs)/_layout.tsx` | Add conditional admin tab |
| Create | `app/(tabs)/admin.tsx` | Admin tab redirect screen |
| Modify | `supabase/functions/add-property-to-admin/index.ts` | Add duplicate property_id check |

---

### Task 1: Fix Forgot Password Button

**Files:**
- Modify: `app/(auth)/login.tsx:48-54`

- [ ] **Step 1: Replace the handleForgotPassword function**

In `app/(auth)/login.tsx`, add `watch` to the useForm destructure and replace the handler:

```typescript
// Line 22-29: Add watch to destructured values
const {
  control,
  handleSubmit,
  watch,
  formState: { errors },
} = useForm<LoginForm>({
  resolver: zodResolver(loginSchema),
  defaultValues: { email: '', password: '' },
});
```

```typescript
// Lines 48-54: Replace handleForgotPassword
const handleForgotPassword = async () => {
  const email = watch('email');
  if (!email || !email.includes('@')) {
    Toast.show({
      type: 'info',
      text1: 'Enter your email above, then tap here again',
    });
    return;
  }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } else {
      Toast.show({
        type: 'success',
        text1: 'Check your email',
        text2: 'We sent a password reset link',
      });
    }
  } catch {
    Toast.show({ type: 'error', text1: 'Something went wrong' });
  }
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to login.tsx

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/login.tsx
git commit -m "fix: implement forgot password with supabase.auth.resetPasswordForEmail"
```

---

### Task 2: Database Schema Fixes

**Files:**
- Create: `supabase/migrations/007_m2_schema_fixes.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/007_m2_schema_fixes.sql`:

```sql
-- 007_m2_schema_fixes.sql
-- Fixes schema gaps discovered during M1 audit

-- 1. Add data column to notifications for structured metadata (deep link targets, etc.)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data jsonb;

-- 2. Add type constraint to posts table (was missing — any string accepted)
-- First clean up any invalid types if they exist
UPDATE posts SET type = 'announcement' WHERE type NOT IN ('announcement', 'event', 'offer');

ALTER TABLE posts ADD CONSTRAINT check_post_type
  CHECK (type IN ('announcement', 'event', 'offer'));
```

- [ ] **Step 2: Verify migration syntax**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && cat supabase/migrations/007_m2_schema_fixes.sql`
Expected: File contents match above

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_m2_schema_fixes.sql
git commit -m "fix: add notifications.data column and posts.type CHECK constraint"
```

---

### Task 3: Add Text Search to businessesService.filter()

**Files:**
- Modify: `services/businesses.ts:20-28`

- [ ] **Step 1: Update the filter method signature and implementation**

Replace the entire `filter` method in `services/businesses.ts`:

```typescript
async filter(
  filters: Record<string, string>,
  search?: string
): Promise<Business[]> {
  let query = supabase.from('businesses').select('*');
  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }
  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,business_description.ilike.%${search}%`
    );
  }
  const { data, error } = await query;
  if (error) throw error;
  return data;
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to businesses.ts

- [ ] **Step 3: Commit**

```bash
git add services/businesses.ts
git commit -m "fix: add text search to businessesService.filter() via ilike"
```

---

### Task 4: Add Missing CRUD Methods to postsService

**Files:**
- Modify: `services/posts.ts:39-40`

- [ ] **Step 1: Add getById, update, and delete methods**

Append before the closing `};` of `postsService` in `services/posts.ts` (after the `create` method, before line 40's `};`):

```typescript
  async getById(id: string): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to posts.ts

- [ ] **Step 3: Commit**

```bash
git add services/posts.ts
git commit -m "fix: add getById, update, delete methods to postsService"
```

---

### Task 5: Add Missing CATEGORY_COLORS

**Files:**
- Modify: `constants/colors.ts:18-28`

- [ ] **Step 1: Replace CATEGORY_COLORS with complete set**

Replace the entire `CATEGORY_COLORS` object in `constants/colors.ts`:

```typescript
export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#EF4444',
  accounting: '#3B82F6',
  legal: '#8B5CF6',
  hvac: '#F59E0B',
  medical: '#10B981',
  retail: '#EC4899',
  technology: '#6366F1',
  construction: '#F97316',
  manufacturing: '#78716C',
  logistics: '#0EA5E9',
  food_service: '#D97706',
  professional_services: '#7C3AED',
  healthcare: '#14B8A6',
  automotive: '#DC2626',
  other: '#6B7280',
};
```

- [ ] **Step 2: Verify all 15 categories from categories.ts are covered**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && node -e "
const cats = require('./constants/categories').BUSINESS_CATEGORIES || [];
// If require fails due to TS, just verify manually
console.log('Check: categories.ts has 15 entries, colors.ts should match');
" 2>&1 || echo "TS file - verify manually that all 15 categories in categories.ts have a color"`

Cross-check: The 15 categories in `constants/categories.ts` are: restaurant, accounting, legal, hvac, medical, retail, technology, construction, manufacturing, logistics, food_service, professional_services, healthcare, automotive, other. All 15 now have colors.

- [ ] **Step 3: Commit**

```bash
git add constants/colors.ts
git commit -m "fix: add missing CATEGORY_COLORS for 6 categories"
```

---

### Task 6: Fix adminService.getStats() Semantic Bug

**Files:**
- Modify: `services/admin.ts:56-76`

- [ ] **Step 1: Replace the getStats method**

Replace the entire `getStats` method in `services/admin.ts`:

```typescript
async getStats(propertyId: string): Promise<{
  totalTenants: number;
  activeAccounts: number;
  pendingInvites: number;
  activePromotions: number;
}> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [businesses, profiles, promotions] = await Promise.all([
    supabase
      .from('businesses')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId),
    supabase
      .from('profiles')
      .select('id, status', { count: 'exact' })
      .contains('property_ids', [propertyId]),
    supabase
      .from('advertiser_promotions')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .eq('approval_status', 'approved')
      .gte('created_at', thirtyDaysAgo),
  ]);

  const profileData = profiles.data ?? [];
  const activeCount = profileData.filter((p) => p.status === 'active').length;
  const pendingCount = profileData.filter((p) => p.status === 'invited').length;

  return {
    totalTenants: businesses.count ?? 0,
    activeAccounts: activeCount,
    pendingInvites: pendingCount,
    activePromotions: promotions.count ?? 0,
  };
},
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to admin.ts

- [ ] **Step 3: Commit**

```bash
git add services/admin.ts
git commit -m "fix: getStats queries advertiser_promotions instead of posts for promotion count"
```

---

### Task 7: Add Admin Tab to Tab Layout

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Create: `app/(tabs)/admin.tsx`

- [ ] **Step 1: Add Shield import and admin tab to layout**

Update `app/(tabs)/_layout.tsx` — add `Shield` to the lucide import and add the conditional admin tab:

```typescript
import { Tabs } from 'expo-router';
import { Building2, Megaphone, Users, Bell, User, Shield } from 'lucide-react-native';
import { useAuth } from '@/lib/AuthContext';
import { BRAND } from '@/constants/colors';

export default function TabLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BRAND.navy,
        tabBarInactiveTintColor: BRAND.steel,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: BRAND.gray,
        },
      }}
    >
      <Tabs.Screen
        name="directory"
        options={{
          title: 'Directory',
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="promotions"
        options={{
          title: 'Promotions',
          tabBarIcon: ({ color, size }) => <Megaphone size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      {isAdmin && (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
          }}
        />
      )}
    </Tabs>
  );
}
```

- [ ] **Step 2: Create the admin tab redirect screen**

Create `app/(tabs)/admin.tsx`:

```typescript
import { useEffect } from 'react';
import { router } from 'expo-router';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

export default function AdminTabRedirect() {
  useEffect(() => {
    router.replace('/(admin)/');
  }, []);

  return <LoadingScreen message="Loading admin..." />;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/admin.tsx
git commit -m "feat: add conditional admin tab for landlord users"
```

---

### Task 8: Fix add-property-to-admin Duplicate Check

**Files:**
- Modify: `supabase/functions/add-property-to-admin/index.ts:47-49`

- [ ] **Step 1: Add duplicate check before appending**

In `supabase/functions/add-property-to-admin/index.ts`, replace lines 47-49:

```typescript
// Old:
// const currentIds = profile.property_ids ?? [];
// const updatedIds = [...currentIds, property_id];

// New:
const currentIds: string[] = profile.property_ids ?? [];
if (currentIds.includes(property_id)) {
  return new Response(
    JSON.stringify({ success: true, message: 'Property already assigned' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
const updatedIds = [...currentIds, property_id];
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/add-property-to-admin/index.ts
git commit -m "fix: prevent duplicate property_ids in add-property-to-admin"
```

---

### Task 9: Update Notifications Placeholder Text

**Files:**
- Modify: `app/(tabs)/notifications.tsx`

- [ ] **Step 1: Update placeholder to say Milestone 3**

In `app/(tabs)/notifications.tsx`, change the placeholder text from "Coming in Milestone 2" to "Coming in Milestone 3":

```typescript
<Text className="text-brand-steel text-lg">Coming in Milestone 3</Text>
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/notifications.tsx
git commit -m "chore: update notifications placeholder to Milestone 3"
```

---

## Verification Checklist

After all 9 tasks are complete:

- [ ] Run `npx tsc --noEmit` — zero errors
- [ ] Run `npx expo start --web` — app loads without crashes
- [ ] Verify forgot password shows success toast (manual test with valid email)
- [ ] Verify admin tab appears for landlord users (manual test)
- [ ] Verify admin tab hidden for tenant users (manual test)
- [ ] Final commit with all changes if any were missed
