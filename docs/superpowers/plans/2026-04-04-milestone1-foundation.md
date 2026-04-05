# Milestone 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Archive the React web SPA, initialize a fresh Expo/React Native project, build complete auth infrastructure (login, signup, forced password reset, onboarding), port the Supabase service layer, and deploy the `invite-tenant` Edge Function — so that by the end, an admin can invite tenants who receive emails, log in, reset their password, and land on a working app shell.

**Architecture:** Single Expo project with Expo Router file-based routing, NativeWind for styling, Supabase JS with AsyncStorage for auth persistence. Auth state managed via React Context. Route protection enforced in the root layout. Edge Functions handle privileged operations (user creation, property assignment).

**Tech Stack:** Expo SDK 53, TypeScript (strict), Expo Router v4, NativeWind v4, TanStack React Query v5, React Hook Form + Zod, Supabase JS v2, expo-image-picker, expo-linear-gradient

**Spec Reference:** `docs/superpowers/specs/2026-04-04-expo-mobile-rebuild-design.md` — Sections 2-5, 8, 11, 15

---

## File Map

### Files to Create

```
app/_layout.tsx                    # Root layout: QueryClient, AuthProvider, auth guard routing
app/(auth)/_layout.tsx             # Auth stack layout
app/(auth)/login.tsx               # Email + password login screen
app/(auth)/signup.tsx              # Self-registration screen
app/(auth)/reset-password.tsx      # Forced reset + forgot password screen
app/(auth)/onboarding.tsx          # Property selection + business profile wizard
app/(tabs)/_layout.tsx             # Bottom tab bar layout (placeholder screens)
app/(tabs)/directory.tsx           # Placeholder directory screen
app/(admin)/_layout.tsx            # Admin stack layout (role-gated, placeholder)
app/(admin)/index.tsx              # Placeholder admin dashboard

services/supabase.ts               # Supabase client singleton with AsyncStorage adapter
services/properties.ts             # Properties CRUD (ported from web)
services/businesses.ts             # Businesses CRUD (ported from web)
services/posts.ts                  # Posts CRUD (ported from web)
services/notifications.ts          # Notifications CRUD + getUnreadCount (ported + extended)
services/storage.ts                # File upload adapted for expo-image-picker
services/profiles.ts               # Profiles CRUD (new)
services/advertiser-promotions.ts  # Advertiser promotions CRUD (new)
services/admin.ts                  # Edge Function wrappers (new)
services/push.ts                   # Push token registration (new, stub for milestone 3)

lib/AuthContext.tsx                # Auth state provider (rewritten from web)
lib/query-client.ts                # TanStack Query config

constants/colors.ts                # Brand palette + semantic colors
constants/categories.ts            # Business category definitions

hooks/useCurrentUser.ts            # Current user's business profile

supabase/migrations/006_mobile_mvp.sql  # New profiles columns + advertiser_promotions table
supabase/functions/invite-tenant/index.ts        # Bulk tenant creation + invite emails
supabase/functions/complete-onboarding/index.ts  # Self-reg property assignment
supabase/functions/add-property-to-admin/index.ts # Property_ids array update

tailwind.config.js                 # NativeWind Tailwind config with brand tokens
global.css                         # Tailwind directives
metro.config.js                    # Metro bundler config for NativeWind
nativewind-env.d.ts                # NativeWind TypeScript declarations
babel.config.js                    # Babel config for NativeWind + Reanimated
tsconfig.json                      # TypeScript config (strict)
app.json                           # Expo app config
eas.json                           # EAS Build profiles
.env.example                       # Environment variable template

components/ui/Button.tsx           # Primary, secondary, destructive, ghost variants
components/ui/Input.tsx            # TextInput wrapper with label + error state
components/ui/GradientHeader.tsx   # Brand gradient header bar
components/ui/LoadingScreen.tsx    # Full-screen loading spinner

__tests__/services/properties.test.ts   # Properties service unit tests
__tests__/services/businesses.test.ts   # Businesses service unit tests
__tests__/services/profiles.test.ts     # Profiles service unit tests
__tests__/hooks/useCurrentUser.test.ts  # useCurrentUser hook tests
```

### Files to Delete (after archiving)

```
src/                    # Entire React web source
public/                 # Web static assets
vite.config.js          # Vite build config
vitest.config.js        # Vitest config
postcss.config.js       # PostCSS config
tailwind.config.js      # Web Tailwind config (replaced by new one)
eslint.config.js        # Web ESLint config
jsconfig.json           # Replaced by tsconfig.json
index.html              # Vite entry point
package.json            # Replaced entirely
package-lock.json       # Regenerated
playwright.config.js    # Web E2E config
playwright-report/      # Web test artifacts
test-results/           # Web test artifacts
tests/                  # Web tests
components.json         # shadcn config
dist/                   # Web build output
CHANGELOG.md            # Web changelog
node_modules/           # Regenerated
specs/                  # Old spec files
.cursorrules            # IDE-specific
```

### Files to Keep (unchanged)

```
supabase/migrations/001-005  # Existing database schema
scripts/seed-landlord.sql    # Admin promotion script
docs/                        # PRD, proposal, brand docs, specs
.planning/                   # GSD workflow artifacts
.git/                        # History preserved
.claude/                     # Claude config
CLAUDE.md                    # Project instructions (will need update)
README.md                    # Will need update
```

---

## Task 1: Archive Web App and Clean Repo

**Files:**
- Delete: All files listed in "Files to Delete" above
- Keep: All files listed in "Files to Keep" above

- [ ] **Step 1: Create archive tag**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add -A
git stash
git tag v1-web-archive -m "Archive React web SPA before Expo mobile rebuild"
```

- [ ] **Step 2: Remove web-specific files**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
rm -rf src/ public/ dist/ node_modules/ playwright-report/ test-results/ tests/ specs/
rm -f vite.config.js vitest.config.js postcss.config.js eslint.config.js jsconfig.json index.html package.json package-lock.json playwright.config.js components.json CHANGELOG.md .cursorrules
rm -f tailwind.config.js
```

- [ ] **Step 3: Verify only kept files remain**

```bash
ls "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
```

Expected output should show only: `CLAUDE.md`, `README.md`, `data/`, `docs/`, `scripts/`, `supabase/`, `.planning/`, `.claude/`, `.git/`

- [ ] **Step 4: Commit the clean slate**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add -A
git commit -m "chore: archive web SPA, clean repo for Expo mobile rebuild

Web app archived at tag v1-web-archive. Removed all React web source,
Vite config, web tests, and unused build artifacts. Kept supabase/
migrations, docs/, scripts/, and planning artifacts."
```

---

## Task 2: Initialize Expo Project

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `babel.config.js`, `metro.config.js`, `tailwind.config.js`, `global.css`, `nativewind-env.d.ts`, `eas.json`, `.env.example`, `.gitignore`
- Create: `app/_layout.tsx` (minimal)

- [ ] **Step 1: Initialize Expo in repo root**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx create-expo-app@latest . --template blank-typescript --yes
```

If it complains the directory isn't empty (due to kept files), use:
```bash
npx create-expo-app@latest temp-expo --template blank-typescript --yes
cp -r temp-expo/* temp-expo/.* . 2>/dev/null; rm -rf temp-expo
```

- [ ] **Step 2: Install Expo Router**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo install expo-router expo-linking expo-constants expo-status-bar expo-splash-screen
```

- [ ] **Step 3: Install Supabase + data layer deps**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npm install @supabase/supabase-js @tanstack/react-query @react-native-async-storage/async-storage
```

- [ ] **Step 4: Install form + validation deps**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npm install react-hook-form @hookform/resolvers zod
```

- [ ] **Step 5: Install NativeWind + Tailwind**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npm install nativewind tailwindcss
```

- [ ] **Step 6: Install UI deps**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo install expo-linear-gradient expo-image-picker
npm install react-native-toast-message lucide-react-native react-native-svg date-fns
```

- [ ] **Step 7: Install dev deps**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npm install -D jest @testing-library/react-native @types/react @types/react-native
```

- [ ] **Step 8: Configure app.json**

Replace the generated `app.json` with:

```json
{
  "expo": {
    "name": "UNIT",
    "slug": "unit-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "scheme": "unit",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#101B29"
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.unitapp.mobile"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#101B29"
      },
      "package": "com.unitapp.mobile"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      "expo-router",
      [
        "expo-image-picker",
        {
          "photosPermission": "UNIT needs photo library access to upload your business logo.",
          "cameraPermission": "UNIT needs camera access to take photos for your business profile."
        }
      ]
    ]
  }
}
```

- [ ] **Step 9: Configure TypeScript (strict)**

Replace `tsconfig.json` with:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

- [ ] **Step 10: Configure NativeWind**

Create `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#101B29',
          'navy-light': '#1D263A',
          blue: '#465A75',
          steel: '#7C8DA7',
          gray: '#E0E1DE',
        },
      },
    },
  },
  plugins: [],
};
```

Create `global.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Create `nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

Update `babel.config.js`:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
```

Create `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

- [ ] **Step 11: Configure EAS Build**

Create `eas.json`:

```json
{
  "cli": {
    "version": ">= 15.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

- [ ] **Step 12: Create .env.example**

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_APP_URL=https://your-app-url.com
```

- [ ] **Step 13: Create minimal root layout to verify app runs**

Create `app/_layout.tsx`:

```typescript
import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
```

Create `app/index.tsx`:

```typescript
import { View, Text } from 'react-native';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-brand-navy">
      <Text className="text-2xl font-bold text-brand-gray">UNIT</Text>
      <Text className="text-brand-steel mt-2">Where Tenants Connect</Text>
    </View>
  );
}
```

- [ ] **Step 14: Update .gitignore**

Ensure `.gitignore` includes:

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
```

- [ ] **Step 15: Verify app runs**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo start --web
```

Expected: Browser opens showing navy background with "UNIT" text and "Where Tenants Connect" subtitle styled with brand colors.

Also verify TypeScript compiles:
```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 16: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add -A
git commit -m "feat: initialize Expo project with TypeScript, NativeWind, and brand tokens

Expo SDK 53, Expo Router v4, NativeWind v4, Supabase JS, TanStack Query,
React Hook Form + Zod. Brand colors configured in Tailwind. Minimal root
layout verifies NativeWind + Expo Router work together."
```

---

## Task 3: Supabase Client and Service Layer

**Files:**
- Create: `services/supabase.ts`, `services/properties.ts`, `services/businesses.ts`, `services/posts.ts`, `services/notifications.ts`, `services/storage.ts`, `services/profiles.ts`, `services/advertiser-promotions.ts`, `services/admin.ts`, `services/push.ts`
- Create: `lib/query-client.ts`

- [ ] **Step 1: Create Supabase client**

Create `services/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing required Supabase environment variables: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 2: Create Query Client**

Create `lib/query-client.ts`:

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
```

- [ ] **Step 3: Port properties service**

Create `services/properties.ts`:

```typescript
import { supabase } from './supabase';

export type Property = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  type: string;
  total_units: number;
  image_url: string | null;
  created_at: string;
};

const PROPERTY_COLUMNS = 'id, name, address, city, state, type, total_units, image_url, created_at';

export const propertiesService = {
  async list(): Promise<Property[]> {
    const { data, error } = await supabase
      .from('properties')
      .select(PROPERTY_COLUMNS);
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .select(PROPERTY_COLUMNS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async filter(filters: Record<string, string>): Promise<Property[]> {
    let query = supabase.from('properties').select(PROPERTY_COLUMNS);
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(propertyData: Omit<Property, 'id' | 'created_at'>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .insert(propertyData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Property>): Promise<Property> {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

- [ ] **Step 4: Port businesses service**

Create `services/businesses.ts`:

```typescript
import { supabase } from './supabase';

export type Business = {
  id: string;
  property_id: string;
  owner_email: string;
  business_name: string;
  unit_number: string | null;
  category: string;
  business_description: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  logo_url: string | null;
  is_featured: boolean;
  created_at: string;
};

export const businessesService = {
  async filter(filters: Record<string, string>): Promise<Business[]> {
    let query = supabase.from('businesses').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(businessData: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .insert(businessData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Business>): Promise<Business> {
    const { data, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

- [ ] **Step 5: Port posts service**

Create `services/posts.ts`:

```typescript
import { supabase } from './supabase';

export type Post = {
  id: string;
  property_id: string;
  business_id: string;
  type: 'announcement' | 'event' | 'offer';
  title: string;
  content: string;
  event_date: string | null;
  event_time: string | null;
  expiry_date: string | null;
  image_url: string | null;
  created_date: string;
};

export const postsService = {
  async filter(
    filters: Record<string, string>,
    orderBy = 'created_date',
    ascending = false
  ): Promise<Post[]> {
    let query = supabase.from('posts').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(postData: Partial<Post>): Promise<Post> {
    const { data, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

- [ ] **Step 6: Port notifications service with getUnreadCount**

Create `services/notifications.ts`:

```typescript
import { supabase } from './supabase';

export type Notification = {
  id: string;
  user_email: string;
  property_id: string;
  type: string;
  title: string;
  message: string;
  related_id: string | null;
  read: boolean;
  created_date: string;
};

export const notificationsService = {
  async filter(
    filters: Record<string, string | boolean>,
    orderBy = 'created_date',
    ascending = false,
    limit: number | null = null
  ): Promise<Notification[]> {
    let query = supabase.from('notifications').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    if (limit) {
      query = query.limit(limit);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async create(notificationData: Partial<Notification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notificationData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Notification>): Promise<Notification> {
    const { data, error } = await supabase
      .from('notifications')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markAllRead(userEmail: string, propertyId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_email', userEmail)
      .eq('property_id', propertyId)
      .eq('read', false);
    if (error) throw error;
  },

  async getUnreadCount(userEmail: string, propertyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_email', userEmail)
      .eq('property_id', propertyId)
      .eq('read', false);
    if (error) throw error;
    return count ?? 0;
  },
};
```

- [ ] **Step 7: Create storage service adapted for expo-image-picker**

Create `services/storage.ts`:

```typescript
import { supabase } from './supabase';

export const storageService = {
  async uploadFile(uri: string, fileExtension = 'jpg'): Promise<{ file_url: string }> {
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `uploads/${fileName}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('public-assets')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${fileExtension}`,
        upsert: false,
      });
    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('public-assets')
      .getPublicUrl(filePath);

    return { file_url: publicUrl };
  },
};
```

- [ ] **Step 8: Create profiles service**

Create `services/profiles.ts`:

```typescript
import { supabase } from './supabase';

export type Profile = {
  id: string;
  role: 'tenant' | 'landlord';
  property_ids: string[];
  email: string;
  push_token: string | null;
  needs_password_change: boolean;
  display_name: string | null;
  invited_at: string | null;
  activated_at: string | null;
  status: 'invited' | 'active' | 'inactive';
  created_at: string;
};

export const profilesService = {
  async getCurrent(): Promise<Profile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) return null;
    return data;
  },

  async update(id: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listByProperty(propertyId: string): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .contains('property_ids', [propertyId]);
    if (error) throw error;
    return data;
  },

  async disable(id: string): Promise<Profile> {
    return this.update(id, { status: 'inactive' });
  },

  async reactivate(id: string): Promise<Profile> {
    return this.update(id, { status: 'active' });
  },
};
```

- [ ] **Step 9: Create advertiser-promotions service**

Create `services/advertiser-promotions.ts`:

```typescript
import { supabase } from './supabase';

export type AdvertiserPromotion = {
  id: string;
  property_id: string;
  business_name: string;
  business_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  headline: string;
  description: string | null;
  image_url: string | null;
  cta_link: string | null;
  cta_text: string | null;
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

export const advertiserPromotionsService = {
  async filter(
    filters: Record<string, string>,
    orderBy = 'created_at',
    ascending = false
  ): Promise<AdvertiserPromotion[]> {
    let query = supabase.from('advertiser_promotions').select('*');
    for (const [key, value] of Object.entries(filters)) {
      query = query.eq(key, value);
    }
    query = query.order(orderBy, { ascending });
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getById(id: string): Promise<AdvertiserPromotion> {
    const { data, error } = await supabase
      .from('advertiser_promotions')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create(promotionData: Partial<AdvertiserPromotion>): Promise<AdvertiserPromotion> {
    const { data, error } = await supabase
      .from('advertiser_promotions')
      .insert(promotionData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateStatus(
    id: string,
    approvalStatus: 'approved' | 'rejected',
    approvedBy: string
  ): Promise<AdvertiserPromotion> {
    const { data, error } = await supabase
      .from('advertiser_promotions')
      .update({
        approval_status: approvalStatus,
        approved_by: approvedBy,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
};
```

- [ ] **Step 10: Create admin service (Edge Function wrappers)**

Create `services/admin.ts`:

```typescript
import { supabase } from './supabase';

export type TenantImportInput = {
  email: string;
  business_name: string;
  category: string;
  contact_name?: string;
  contact_phone?: string;
  services?: string;
  description?: string;
  property_id: string;
};

export type ImportResult = {
  imported: number;
  failed: Array<{ email: string; reason: string }>;
  total: number;
};

export const adminService = {
  async inviteTenants(tenants: TenantImportInput[]): Promise<ImportResult> {
    const { data, error } = await supabase.functions.invoke('invite-tenant', {
      body: { tenants },
    });
    if (error) throw error;
    return data;
  },

  async completeOnboarding(propertyId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('complete-onboarding', {
      body: { property_id: propertyId },
    });
    if (error) throw error;
  },

  async addPropertyToAdmin(propertyId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('add-property-to-admin', {
      body: { property_id: propertyId },
    });
    if (error) throw error;
  },

  async sendPush(params: {
    property_id: string;
    title: string;
    message: string;
    data?: { type: string; id?: string };
    audience?: 'all' | 'active';
    exclude_email?: string;
  }): Promise<{ sent: number; failed: number }> {
    const { data, error } = await supabase.functions.invoke('send-push-notification', {
      body: params,
    });
    if (error) throw error;
    return data;
  },

  async getStats(propertyId: string): Promise<{
    totalTenants: number;
    activeAccounts: number;
    pendingInvites: number;
    activePromotions: number;
  }> {
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
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('property_id', propertyId)
        .gte('created_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
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
};
```

- [ ] **Step 11: Create push service stub**

Create `services/push.ts`:

```typescript
import { supabase } from './supabase';

export const pushService = {
  async registerToken(token: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', user.id);
    if (error) throw error;
  },

  async unregisterToken(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ push_token: null })
      .eq('id', user.id);
    if (error) throw error;
  },
};
```

- [ ] **Step 12: Verify TypeScript compiles**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 13: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add services/ lib/query-client.ts
git commit -m "feat: port Supabase service layer to TypeScript

Ported properties, businesses, posts, notifications, storage services
from web app. Added new services: profiles, advertiser-promotions, admin
(Edge Function wrappers), push (stub). All services use typed interfaces.
Storage adapted for expo-image-picker URI format. Query client configured
for mobile (longer staleTime, refetchOnReconnect)."
```

---

## Task 4: Constants and Custom Hooks

**Files:**
- Create: `constants/colors.ts`, `constants/categories.ts`, `hooks/useCurrentUser.ts`

- [ ] **Step 1: Create brand color constants**

Create `constants/colors.ts`:

```typescript
export const BRAND = {
  navy: '#101B29',
  navyLight: '#1D263A',
  blue: '#465A75',
  steel: '#7C8DA7',
  gray: '#E0E1DE',
} as const;

export const STATUS_COLORS = {
  invited: { bg: '#FEF3C7', text: '#92400E' },
  active: { bg: '#D1FAE5', text: '#065F46' },
  inactive: { bg: '#F3F4F6', text: '#6B7280' },
  pending: { bg: '#FEF3C7', text: '#92400E' },
  approved: { bg: '#D1FAE5', text: '#065F46' },
  rejected: { bg: '#FEE2E2', text: '#991B1B' },
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  restaurant: '#EF4444',
  accounting: '#3B82F6',
  legal: '#8B5CF6',
  hvac: '#F59E0B',
  medical: '#10B981',
  retail: '#EC4899',
  technology: '#6366F1',
  construction: '#F97316',
  other: '#6B7280',
};
```

- [ ] **Step 2: Create category definitions**

Create `constants/categories.ts`:

```typescript
export const BUSINESS_CATEGORIES = [
  'restaurant',
  'accounting',
  'legal',
  'hvac',
  'medical',
  'retail',
  'technology',
  'construction',
  'manufacturing',
  'logistics',
  'food_service',
  'professional_services',
  'healthcare',
  'automotive',
  'other',
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];

export function getCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
```

- [ ] **Step 3: Create useCurrentUser hook**

Create `hooks/useCurrentUser.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { businessesService, type Business } from '@/services/businesses';

export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery<Business | null>({
    queryKey: ['currentUser', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const businesses = await businessesService.filter({ owner_email: user.email });
      return businesses[0] ?? null;
    },
    enabled: !!user?.email,
  });
}
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add constants/ hooks/
git commit -m "feat: add brand constants and useCurrentUser hook

Brand palette, status colors, category colors, and category definitions.
useCurrentUser replaces the duplicated currentUser query pattern from
5+ pages in the web app."
```

---

## Task 5: Core UI Components

**Files:**
- Create: `components/ui/Button.tsx`, `components/ui/Input.tsx`, `components/ui/GradientHeader.tsx`, `components/ui/LoadingScreen.tsx`

- [ ] **Step 1: Create Button component**

Create `components/ui/Button.tsx`:

```typescript
import { Pressable, Text, ActivityIndicator } from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

type ButtonProps = {
  onPress: () => void;
  children: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-brand-navy',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-brand-gray border border-brand-steel',
    text: 'text-brand-navy',
  },
  destructive: {
    container: 'bg-red-600',
    text: 'text-white',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-brand-navy',
  },
};

export function Button({
  onPress,
  children,
  variant = 'primary',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-xl px-6 py-3.5 items-center justify-center ${styles.container} ${
        disabled ? 'opacity-50' : ''
      } ${className}`}
      style={({ pressed }) => ({ opacity: pressed && !disabled ? 0.8 : 1 })}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#101B29' : '#FFFFFF'} />
      ) : (
        <Text className={`text-base font-semibold ${styles.text}`}>{children}</Text>
      )}
    </Pressable>
  );
}
```

- [ ] **Step 2: Create Input component**

Create `components/ui/Input.tsx`:

```typescript
import { View, Text, TextInput, type TextInputProps } from 'react-native';

type InputProps = TextInputProps & {
  label: string;
  error?: string;
};

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <View className={`mb-4 ${className}`}>
      <Text className="text-sm font-medium text-brand-navy mb-1.5">{label}</Text>
      <TextInput
        className={`border rounded-xl px-4 py-3 text-base text-brand-navy bg-white ${
          error ? 'border-red-500' : 'border-brand-steel/30'
        }`}
        placeholderTextColor="#7C8DA7"
        {...props}
      />
      {error && <Text className="text-sm text-red-500 mt-1">{error}</Text>}
    </View>
  );
}
```

- [ ] **Step 3: Create GradientHeader component**

Create `components/ui/GradientHeader.tsx`:

```typescript
import { View, type ViewProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type GradientHeaderProps = ViewProps & {
  children: React.ReactNode;
};

export function GradientHeader({ children, className = '', ...props }: GradientHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient
      colors={['#101B29', '#465A75']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ paddingTop: insets.top }}
    >
      <View className={`px-4 pb-4 pt-2 ${className}`} {...props}>
        {children}
      </View>
    </LinearGradient>
  );
}
```

- [ ] **Step 4: Create LoadingScreen component**

Create `components/ui/LoadingScreen.tsx`:

```typescript
import { View, ActivityIndicator, Text } from 'react-native';

type LoadingScreenProps = {
  message?: string;
};

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View className="flex-1 items-center justify-center bg-brand-navy">
      <ActivityIndicator size="large" color="#7C8DA7" />
      {message && <Text className="text-brand-steel mt-4 text-base">{message}</Text>}
    </View>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add components/
git commit -m "feat: add core UI components (Button, Input, GradientHeader, LoadingScreen)

NativeWind-styled components with brand tokens. Button supports primary,
secondary, destructive, ghost variants with loading state. Input has
label and error display. GradientHeader uses expo-linear-gradient with
safe area insets."
```

---

## Task 6: Auth Context Provider

**Files:**
- Create: `lib/AuthContext.tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create AuthContext**

Create `lib/AuthContext.tsx`:

```typescript
import React, { createContext, useState, useContext, useEffect, type ReactNode } from 'react';
import { supabase } from '@/services/supabase';
import { type Profile } from '@/services/profiles';
import type { User } from '@supabase/supabase-js';

type AuthState = {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  needsPasswordChange: boolean;
  needsOnboarding: boolean;
  propertyIds: string[];
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const fetchProfile = async (userId: string, userEmail: string) => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    setProfile(profileData);

    if (profileData && !profileData.needs_password_change) {
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_email', userEmail)
        .limit(1);

      setNeedsOnboarding(!businesses || businesses.length === 0);
    } else {
      setNeedsOnboarding(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id, session.user.email ?? '');
      }
      setIsLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id, session.user.email ?? '');
        } else {
          setUser(null);
          setProfile(null);
          setNeedsOnboarding(false);
        }
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    setUser(null);
    setProfile(null);
    setNeedsOnboarding(false);
    await supabase.auth.signOut();
  };

  const isAuthenticated = !!user;
  const isAdmin = profile?.role === 'landlord';
  const needsPasswordChange = profile?.needs_password_change ?? false;
  const propertyIds = profile?.property_ids ?? [];

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAuthenticated,
        isLoading,
        isAdmin,
        needsPasswordChange,
        needsOnboarding,
        propertyIds,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 2: Update root layout with providers and auth guard**

Replace `app/_layout.tsx`:

```typescript
import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

function AuthGuard() {
  const { isAuthenticated, isLoading, needsPasswordChange, needsOnboarding } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && needsPasswordChange) {
      router.replace('/(auth)/reset-password');
    } else if (isAuthenticated && needsOnboarding && !inAuthGroup) {
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated && !needsPasswordChange && !needsOnboarding && inAuthGroup) {
      router.replace('/(tabs)/directory');
    }
  }, [isAuthenticated, isLoading, needsPasswordChange, needsOnboarding, segments]);

  if (isLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="light" />
          <AuthGuard />
          <Toast />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
```

- [ ] **Step 3: Install safe-area-context if not already present**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo install react-native-safe-area-context
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add lib/AuthContext.tsx app/_layout.tsx
git commit -m "feat: add AuthContext with role detection and auth guard routing

Auth state machine: loading -> unauthenticated -> login, authenticated
+ needs_password_change -> reset-password, authenticated + needs_onboarding
-> onboarding, authenticated -> tabs. Admin role derived from
profile.role === 'landlord'."
```

---

## Task 7: Auth Screens (Login, Signup, Reset Password)

**Files:**
- Create: `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `app/(auth)/reset-password.tsx`

- [ ] **Step 1: Create auth layout**

Create `app/(auth)/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#101B29' },
      }}
    />
  );
}
```

- [ ] **Step 2: Create login screen**

Create `app/(auth)/login.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Login failed',
        text2: error.message,
      });
    }
    // On success, onAuthStateChange fires and AuthGuard handles navigation
  };

  const handleForgotPassword = async () => {
    // Prompt would be better UX, but keeping simple for MVP
    Toast.show({
      type: 'info',
      text1: 'Enter your email above, then tap here again',
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-10">
          <Text className="text-3xl font-bold text-white text-center mb-2">UNIT</Text>
          <Text className="text-brand-steel text-center mb-10">Where Tenants Connect</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@business.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-2">
            Log In
          </Button>

          <Pressable onPress={handleForgotPassword} className="mt-4 items-center">
            <Text className="text-brand-steel text-sm">Forgot password?</Text>
          </Pressable>

          <View className="mt-8 items-center">
            <Text className="text-brand-steel">
              Don't have an account?{' '}
              <Link href="/(auth)/signup" className="text-white font-semibold">
                Sign Up
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 3: Create signup screen**

Create `app/(auth)/signup.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: SignupForm) => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    setLoading(false);

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Signup failed',
        text2: error.message,
      });
    }
    // On success, auto-trigger creates profile, onAuthStateChange fires,
    // AuthGuard detects needsOnboarding and redirects to onboarding
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-10">
          <Text className="text-3xl font-bold text-white text-center mb-2">Create Account</Text>
          <Text className="text-brand-steel text-center mb-10">Join your property community</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="you@business.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="At least 8 characters"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm Password"
                placeholder="Re-enter your password"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-2">
            Sign Up
          </Button>

          <View className="mt-8 items-center">
            <Text className="text-brand-steel">
              Already have an account?{' '}
              <Link href="/(auth)/login" className="text-white font-semibold">
                Log In
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 4: Create reset-password screen**

Create `app/(auth)/reset-password.tsx`:

```typescript
import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { supabase } from '@/services/supabase';
import { profilesService } from '@/services/profiles';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const [loading, setLoading] = useState(false);
  const { user, profile } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetForm) => {
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Password update failed',
        text2: error.message,
      });
      return;
    }

    // Update profile to clear the forced reset flag
    if (profile?.id) {
      await profilesService.update(profile.id, {
        needs_password_change: false,
        status: 'active',
        activated_at: new Date().toISOString(),
      });
    }

    setLoading(false);
    Toast.show({
      type: 'success',
      text1: 'Password updated',
      text2: 'You can now use the app',
    });

    // AuthGuard will detect needs_password_change is now false and redirect
    // Force a re-check by reloading the session
    await supabase.auth.refreshSession();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 py-10">
          <Text className="text-3xl font-bold text-white text-center mb-2">Set New Password</Text>
          <Text className="text-brand-steel text-center mb-10">
            Please create a new password to secure your account
          </Text>

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="New Password"
                placeholder="At least 8 characters"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Confirm New Password"
                placeholder="Re-enter your new password"
                secureTextEntry
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-2">
            Update Password
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add app/\(auth\)/
git commit -m "feat: add auth screens (login, signup, reset-password)

Email/password login with Zod validation. Self-registration with password
confirmation. Forced password reset screen for invited tenants. All
screens use brand styling, KeyboardAvoidingView, and react-hook-form."
```

---

## Task 8: Onboarding Wizard

**Files:**
- Create: `app/(auth)/onboarding.tsx`

- [ ] **Step 1: Create onboarding screen**

Create `app/(auth)/onboarding.tsx`:

```typescript
import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  Pressable,
  Image,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { Search } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useQuery } from '@tanstack/react-query';
import { propertiesService, type Property } from '@/services/properties';
import { businessesService } from '@/services/businesses';
import { storageService } from '@/services/storage';
import { adminService } from '@/services/admin';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';

const businessSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  business_description: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  website: z.string().optional(),
});

type BusinessForm = z.infer<typeof businessSchema>;

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<'property' | 'profile' | 'logo'>('property');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [propertySearch, setPropertySearch] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: propertiesService.list,
  });

  const filteredProperties = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.address.toLowerCase().includes(propertySearch.toLowerCase()) ||
      p.city.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<BusinessForm>({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      business_name: '',
      category: '',
      business_description: '',
      contact_name: '',
      contact_email: user?.email ?? '',
      contact_phone: '',
      website: '',
    },
  });

  const handleSelectProperty = (property: Property) => {
    setSelectedProperty(property);
    setStep('profile');
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const onSubmit = async (data: BusinessForm) => {
    if (!selectedProperty || !user?.email) return;

    setLoading(true);

    let logoUrl: string | null = null;
    if (logoUri) {
      const ext = logoUri.split('.').pop() ?? 'jpg';
      const { file_url } = await storageService.uploadFile(logoUri, ext);
      logoUrl = file_url;
    }

    await businessesService.create({
      property_id: selectedProperty.id,
      owner_email: user.email,
      business_name: data.business_name,
      category: data.category,
      business_description: data.business_description || null,
      contact_name: data.contact_name || null,
      contact_email: data.contact_email || null,
      contact_phone: data.contact_phone || null,
      website: data.website || null,
      logo_url: logoUrl,
    });

    // Set property_ids and activate profile via Edge Function
    await adminService.completeOnboarding(selectedProperty.id);

    setLoading(false);
    Toast.show({ type: 'success', text1: 'Profile created!' });

    // AuthGuard detects onboarding complete and redirects to tabs
    // Force re-check by refreshing session
    await supabase.auth.refreshSession();
  };

  if (step === 'property') {
    return (
      <View className="flex-1 bg-brand-navy px-6 pt-16">
        <Text className="text-2xl font-bold text-white mb-2">Select Your Property</Text>
        <Text className="text-brand-steel mb-6">Which business park are you located in?</Text>

        <View className="flex-row items-center bg-brand-navy-light rounded-xl px-4 mb-4">
          <Search size={20} color="#7C8DA7" />
          <Input
            label=""
            placeholder="Search properties..."
            value={propertySearch}
            onChangeText={setPropertySearch}
            className="flex-1 mb-0 border-0"
          />
        </View>

        <FlatList
          data={filteredProperties}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectProperty(item)}
              className="bg-brand-navy-light rounded-xl p-4 mb-3"
            >
              <Text className="text-white font-semibold text-base">{item.name}</Text>
              <Text className="text-brand-steel text-sm mt-1">
                {item.address}, {item.city}, {item.state}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text className="text-brand-steel text-center mt-8">No properties found</Text>
          }
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-brand-navy"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-16 pb-10">
          <Text className="text-2xl font-bold text-white mb-2">Create Your Profile</Text>
          <Text className="text-brand-steel mb-6">
            at {selectedProperty?.name}
          </Text>

          {/* Logo picker */}
          <Pressable onPress={pickImage} className="items-center mb-6">
            {logoUri ? (
              <Image
                source={{ uri: logoUri }}
                className="w-24 h-24 rounded-2xl"
              />
            ) : (
              <View className="w-24 h-24 rounded-2xl bg-brand-navy-light items-center justify-center">
                <Text className="text-brand-steel text-sm">Add Logo</Text>
              </View>
            )}
            <Text className="text-brand-steel text-sm mt-2">Tap to upload</Text>
          </Pressable>

          <Controller
            control={control}
            name="business_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Business Name"
                placeholder="Your business name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.business_name?.message}
              />
            )}
          />

          <Text className="text-sm font-medium text-brand-navy mb-1.5">Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <Controller
              control={control}
              name="category"
              render={({ field: { onChange, value } }) => (
                <View className="flex-row gap-2">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => onChange(cat)}
                      className={`px-4 py-2 rounded-full ${
                        value === cat ? 'bg-white' : 'bg-brand-navy-light'
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          value === cat ? 'text-brand-navy font-semibold' : 'text-brand-steel'
                        }`}
                      >
                        {getCategoryLabel(cat)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            />
          </ScrollView>
          {errors.category && (
            <Text className="text-sm text-red-500 -mt-2 mb-4">{errors.category.message}</Text>
          )}

          <Controller
            control={control}
            name="business_description"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Description"
                placeholder="What does your business do?"
                multiline
                numberOfLines={3}
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="contact_name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Contact Name"
                placeholder="Primary contact"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="contact_phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Phone"
                placeholder="(555) 555-5555"
                keyboardType="phone-pad"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Controller
            control={control}
            name="website"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Website"
                placeholder="https://yourbusiness.com"
                keyboardType="url"
                autoCapitalize="none"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4">
            Create Profile
          </Button>

          <Pressable onPress={() => setStep('property')} className="mt-4 items-center">
            <Text className="text-brand-steel">Change property</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

Note: The `supabase` import is missing — add at top of file:
```typescript
import { supabase } from '@/services/supabase';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add app/\(auth\)/onboarding.tsx
git commit -m "feat: add onboarding wizard (property selection + business profile)

Two-step onboarding: 1) searchable property list 2) business profile form
with logo upload via expo-image-picker, category chips, and full contact
fields. Calls complete-onboarding Edge Function to set property_ids and
activate profile."
```

---

## Task 9: Tab Layout and Placeholder Screens

**Files:**
- Create: `app/(tabs)/_layout.tsx`, `app/(tabs)/directory.tsx`, `app/(tabs)/promotions.tsx`, `app/(tabs)/community.tsx`, `app/(tabs)/notifications.tsx`, `app/(tabs)/profile.tsx`
- Create: `app/(admin)/_layout.tsx`, `app/(admin)/index.tsx`
- Delete: `app/index.tsx` (replaced by tab navigation)

- [ ] **Step 1: Create tab layout**

Create `app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { Building2, Megaphone, Users, Bell, User } from 'lucide-react-native';
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
    </Tabs>
  );
}
```

- [ ] **Step 2: Create placeholder directory screen**

Create `app/(tabs)/directory.tsx`:

```typescript
import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function DirectoryScreen() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Directory</Text>
        <Text className="text-brand-steel text-sm">Browse tenant businesses</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Coming in Milestone 2</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Create remaining placeholder tab screens**

Create `app/(tabs)/promotions.tsx`:

```typescript
import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function PromotionsScreen() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Promotions</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Coming in Milestone 2</Text>
      </View>
    </View>
  );
}
```

Create `app/(tabs)/community.tsx`:

```typescript
import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function CommunityScreen() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Community</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Coming in Milestone 2</Text>
      </View>
    </View>
  );
}
```

Create `app/(tabs)/notifications.tsx`:

```typescript
import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function NotificationsScreen() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Notifications</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Coming in Milestone 2</Text>
      </View>
    </View>
  );
}
```

Create `app/(tabs)/profile.tsx`:

```typescript
import { View, Text, Pressable } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function ProfileScreen() {
  const { user, logout, isAdmin } = useAuth();
  const { data: business } = useCurrentUser();

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Profile</Text>
        <Text className="text-brand-steel text-sm">{user?.email}</Text>
      </GradientHeader>
      <View className="flex-1 px-6 pt-6">
        {business && (
          <View className="bg-brand-gray/30 rounded-xl p-4 mb-6">
            <Text className="text-lg font-semibold text-brand-navy">{business.business_name}</Text>
            <Text className="text-brand-steel text-sm mt-1">{business.category}</Text>
          </View>
        )}

        {isAdmin && (
          <View className="bg-blue-50 rounded-xl p-4 mb-6">
            <Text className="text-blue-700 font-semibold">Admin Access</Text>
            <Text className="text-blue-600 text-sm mt-1">
              Admin features coming in Milestone 2
            </Text>
          </View>
        )}

        <Button onPress={logout} variant="destructive" className="mt-auto mb-8">
          Log Out
        </Button>
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Create admin layout and placeholder**

Create `app/(admin)/_layout.tsx`:

```typescript
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';

export default function AdminLayout() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Redirect href="/(tabs)/directory" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
```

Create `app/(admin)/index.tsx`:

```typescript
import { View, Text } from 'react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';

export default function AdminDashboard() {
  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Admin</Text>
      </GradientHeader>
      <View className="flex-1 items-center justify-center">
        <Text className="text-brand-steel text-lg">Admin dashboard coming in Milestone 2</Text>
      </View>
    </View>
  );
}
```

- [ ] **Step 5: Delete the old index.tsx**

```bash
rm "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit/app/index.tsx"
```

- [ ] **Step 6: Verify app runs**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo start --web
```

Expected: App loads, redirects to login screen (not authenticated). After login, should show bottom tab navigation with 5 tabs.

- [ ] **Step 7: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add app/
git commit -m "feat: add tab navigation and placeholder screens

Bottom tab bar with Directory, Promotions, Community, Notifications,
Profile tabs using lucide-react-native icons. Admin layout with role gate.
Profile screen shows current business and logout. All content screens
are placeholders for Milestone 2."
```

---

## Task 10: Database Migration

**Files:**
- Create: `supabase/migrations/006_mobile_mvp.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/006_mobile_mvp.sql`:

```sql
-- Migration 006: Mobile MVP extensions
-- Extends profiles for mobile onboarding and push notifications
-- Creates advertiser_promotions table for local business promotions

-- 1. Extend profiles for mobile onboarding and push notifications
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_token text,
  ADD COLUMN IF NOT EXISTS needs_password_change boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
    CHECK (status IN ('invited', 'active', 'inactive'));

-- Set existing profiles to 'active' status (they're already active users)
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- 2. Advertiser promotions table
CREATE TABLE IF NOT EXISTS advertiser_promotions (
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
CREATE INDEX IF NOT EXISTS idx_profiles_push_token
  ON profiles(push_token) WHERE push_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_advertiser_promotions_property_status
  ON advertiser_promotions(property_id, approval_status);

-- 5. Update the auto-profile trigger to set status = 'active' for self-registering users
-- (invited users get status = 'invited' set by the invite-tenant Edge Function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role, property_ids, email, status, activated_at)
  VALUES (new.id, 'tenant', '{}', new.email, 'active', now())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Run the migration on your Supabase project**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx supabase db push
```

Or if using the Supabase dashboard, copy the SQL and run it in the SQL Editor.

- [ ] **Step 3: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add supabase/migrations/006_mobile_mvp.sql
git commit -m "feat: add migration 006 for mobile MVP

Extends profiles with push_token, needs_password_change, status,
invited_at, activated_at columns. Creates advertiser_promotions table
with RLS policies. Updates auto-profile trigger to set status='active'
for self-registering users."
```

---

## Task 11: Edge Functions

**Files:**
- Create: `supabase/functions/invite-tenant/index.ts`
- Create: `supabase/functions/complete-onboarding/index.ts`
- Create: `supabase/functions/add-property-to-admin/index.ts`

- [ ] **Step 1: Create invite-tenant Edge Function**

Create `supabase/functions/invite-tenant/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? 'UNIT <noreply@unit-app.com>';

  // Verify caller is a landlord
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user: caller } } = await callerClient.auth.getUser();
  if (!caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();
  if (callerProfile?.role !== 'landlord') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { tenants } = await req.json();

  const results = { imported: 0, failed: [] as Array<{ email: string; reason: string }>, total: tenants.length };

  for (const tenant of tenants) {
    try {
      if (!tenant.email || !tenant.business_name || !tenant.category || !tenant.property_id) {
        results.failed.push({ email: tenant.email ?? 'unknown', reason: 'Missing required fields' });
        continue;
      }

      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers();
      const exists = existingUsers?.users?.some((u: { email?: string }) => u.email === tenant.email);
      if (exists) {
        results.failed.push({ email: tenant.email, reason: 'Account already exists' });
        continue;
      }

      // Generate temp password
      const tempPassword = crypto.randomUUID().slice(0, 12);

      // Create auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: tenant.email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError || !newUser.user) {
        results.failed.push({ email: tenant.email, reason: createError?.message ?? 'Failed to create user' });
        continue;
      }

      // Update profile (auto-trigger already created it)
      await adminClient
        .from('profiles')
        .update({
          status: 'invited',
          needs_password_change: true,
          property_ids: [tenant.property_id],
          invited_at: new Date().toISOString(),
        })
        .eq('id', newUser.user.id);

      // Create business record
      await adminClient.from('businesses').insert({
        property_id: tenant.property_id,
        owner_email: tenant.email,
        business_name: tenant.business_name,
        category: tenant.category,
        contact_name: tenant.contact_name ?? null,
        contact_phone: tenant.contact_phone ?? null,
        business_description: tenant.description ?? null,
      });

      // Send invite email via Resend
      if (resendApiKey) {
        const { data: property } = await adminClient
          .from('properties')
          .select('name')
          .eq('id', tenant.property_id)
          .single();

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: resendFromEmail,
            to: tenant.email,
            subject: `You're invited to UNIT — ${property?.name ?? 'Your Property'}`,
            html: `
              <h2>Welcome to UNIT</h2>
              <p>You've been added to UNIT, the tenant networking app for <strong>${property?.name ?? 'your property'}</strong>.</p>
              <p><strong>Your login credentials:</strong></p>
              <p>Email: ${tenant.email}<br>Temporary Password: ${tempPassword}</p>
              <p>On your first login, you'll be asked to set a new password.</p>
              <p>— The UNIT Team</p>
            `,
          }),
        });
      }

      results.imported++;
    } catch (error) {
      results.failed.push({
        email: tenant.email ?? 'unknown',
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return new Response(JSON.stringify(results), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Create complete-onboarding Edge Function**

Create `supabase/functions/complete-onboarding/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Get the calling user
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { property_id } = await req.json();
  if (!property_id) {
    return new Response(JSON.stringify({ error: 'property_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role to update property_ids (RLS prevents client-side update)
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await adminClient
    .from('profiles')
    .update({
      property_ids: [property_id],
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 3: Create add-property-to-admin Edge Function**

Create `supabase/functions/add-property-to-admin/index.ts`:

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.100.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Verify caller is a landlord
  const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await callerClient.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await callerClient
    .from('profiles')
    .select('role, property_ids')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'landlord') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { property_id } = await req.json();
  if (!property_id) {
    return new Response(JSON.stringify({ error: 'property_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Use service role to append to property_ids array
  const adminClient = createClient(supabaseUrl, serviceRoleKey);
  const currentIds = profile.property_ids ?? [];
  const updatedIds = [...currentIds, property_id];

  const { error } = await adminClient
    .from('profiles')
    .update({ property_ids: updatedIds })
    .eq('id', user.id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 4: Deploy Edge Functions**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx supabase functions deploy invite-tenant
npx supabase functions deploy complete-onboarding
npx supabase functions deploy add-property-to-admin
```

Set secrets:
```bash
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
npx supabase secrets set RESEND_API_KEY=<your-resend-api-key>
npx supabase secrets set RESEND_FROM_EMAIL="UNIT <noreply@your-domain.com>"
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add supabase/functions/
git commit -m "feat: add Edge Functions (invite-tenant, complete-onboarding, add-property-to-admin)

invite-tenant: bulk create auth users, profiles, businesses, send invite
emails via Resend. complete-onboarding: set property_ids and activate
profile for self-registering tenants. add-property-to-admin: append
property to admin's property_ids array."
```

---

## Task 12: Update CLAUDE.md for Expo Project

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md to reflect the Expo project**

The CLAUDE.md needs to be updated to describe the new Expo/React Native project instead of the old React web SPA. Key sections to update:

- Project description: mention Expo/React Native mobile app
- Tech stack: replace Vite/React Router/shadcn with Expo/Expo Router/NativeWind
- Conventions: update file extensions (.tsx), import patterns, naming
- Architecture: update layers for mobile (no web-specific patterns)
- Remove references to `src/` paths (now use root-level `app/`, `services/`, `lib/`, etc.)

This is a large file update. Read the current CLAUDE.md and update all sections that reference web-specific technologies, file paths, or patterns.

- [ ] **Step 2: Commit**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Expo/React Native mobile project

Updated project description, tech stack, conventions, architecture, and
file paths to reflect the Expo mobile rebuild. Removed web-specific
references (Vite, React Router, shadcn, src/ paths)."
```

---

## Task 13: End-to-End Smoke Test

This is a manual verification task — no code to write.

- [ ] **Step 1: Start the dev server**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo start --web
```

- [ ] **Step 2: Test self-registration flow**

1. App loads → redirected to login screen
2. Tap "Sign Up" → signup screen
3. Enter email, password (8+ chars), confirm password → tap Sign Up
4. Should redirect to onboarding wizard
5. Select a property → business profile form
6. Fill in business name, select category → tap Create Profile
7. Should redirect to Directory tab with bottom navigation visible

- [ ] **Step 3: Test logout and login**

1. Tap Profile tab → tap Log Out
2. Should redirect to login screen
3. Enter the same credentials → tap Log In
4. Should redirect to Directory tab (onboarding already complete)

- [ ] **Step 4: Test forced password reset (requires Edge Function)**

1. Use the invite-tenant Edge Function (via curl or Supabase dashboard) to create a test tenant
2. Log in with the temp credentials
3. Should be redirected to reset-password screen
4. Set new password → should redirect to tabs

- [ ] **Step 5: Verify TypeScript has no errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
git add -A
git commit -m "fix: address issues found during Milestone 1 smoke test"
```

---

## Summary

After completing all 13 tasks, you will have:

- Web app archived at `v1-web-archive` tag
- Fresh Expo project with TypeScript, NativeWind, brand tokens
- Complete Supabase service layer (10 services, all typed)
- Auth flow: login, signup, forced password reset, onboarding wizard
- Tab navigation shell with 5 tenant tabs + admin placeholder
- Auth guard routing (loading → auth → reset → onboard → tabs)
- Database migration 006 with profiles extensions + advertiser_promotions table
- 3 Edge Functions deployed (invite-tenant, complete-onboarding, add-property-to-admin)
- Updated CLAUDE.md

This is the foundation that Milestone 2 (Core MVP: directory, promotions, community, admin screens) builds on.
