# Milestone 2: Core MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all tenant tab screens (Directory, Profile, Promotions, Community) and admin screens (Dashboard, Tenants, Advertisers, Properties) with a shared UI component library.

**Architecture:** Components-first approach. Phase 1 builds shared UI components + React Query hooks. Phase 2 assembles tenant screens from those parts. Phase 3 builds admin screens. Phase 4 wires integration points. All data flows through React Query hooks wrapping existing Supabase services.

**Tech Stack:** Expo Router, NativeWind, React Query, React Hook Form + Zod, Supabase, @gorhom/bottom-sheet, react-native-qrcode-svg, expo-sharing, date-fns, lucide-react-native

**Design Spec:** `docs/superpowers/specs/2026-04-05-milestone2-core-mvp-design.md`

---

## Pre-requisite: Install Dependencies

- [ ] **Step 1: Install M2 packages**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit"
npx expo install react-native-qrcode-svg @gorhom/bottom-sheet expo-sharing react-native-reanimated react-native-gesture-handler
```

- [ ] **Step 2: Add reanimated babel plugin if not present**

Check `babel.config.js` — add `'react-native-reanimated/plugin'` as the LAST plugin if not already there.

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add package.json yarn.lock babel.config.js
git commit -m "chore: install M2 dependencies (bottom-sheet, qrcode, sharing, reanimated)"
```

---

## Phase 1: Shared UI Components

### Task 1: Card Component

**Files:**
- Create: `components/ui/Card.tsx`

- [ ] **Step 1: Create Card component**

```tsx
import { View, Pressable, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
};

export function Card({ children, onPress, className = '', ...props }: CardProps) {
  const cardStyle = `bg-white rounded-xl shadow-sm border border-gray-100 ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={cardStyle}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={cardStyle} {...props}>
      {children}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/Card.tsx
git commit -m "feat: add Card component with pressable variant"
```

---

### Task 2: Badge and StatusBadge Components

**Files:**
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/StatusBadge.tsx`

- [ ] **Step 1: Create Badge**

```tsx
import { View, Text } from 'react-native';

type BadgeProps = {
  label: string;
  color: { bg: string; text: string };
  size?: 'sm' | 'md';
};

export function Badge({ label, color, size = 'sm' }: BadgeProps) {
  const sizeStyles = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <View
      className={`rounded-full ${sizeStyles}`}
      style={{ backgroundColor: color.bg }}
    >
      <Text className={`${textSize} font-medium`} style={{ color: color.text }}>
        {label}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Create StatusBadge**

```tsx
import { Badge } from './Badge';
import { STATUS_COLORS } from '@/constants/colors';

type StatusBadgeProps = {
  status: keyof typeof STATUS_COLORS;
  size?: 'sm' | 'md';
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.inactive;
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <Badge label={label} color={colors} size={size} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ui/Badge.tsx components/ui/StatusBadge.tsx
git commit -m "feat: add Badge and StatusBadge components"
```

---

### Task 3: Avatar Component

**Files:**
- Create: `components/ui/Avatar.tsx`

- [ ] **Step 1: Create Avatar**

```tsx
import { View, Text, Image } from 'react-native';
import { BRAND } from '@/constants/colors';

type AvatarProps = {
  imageUrl?: string | null;
  name: string;
  size?: number;
};

export function Avatar({ imageUrl, name, size = 40 }: AvatarProps) {
  const initials = name.charAt(0).toUpperCase();

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <View
      className="rounded-full items-center justify-center"
      style={{ width: size, height: size, backgroundColor: BRAND.blue }}
    >
      <Text className="text-white font-bold" style={{ fontSize: size * 0.4 }}>
        {initials}
      </Text>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/Avatar.tsx
git commit -m "feat: add Avatar component with image and initials fallback"
```

---

### Task 4: SearchBar Component

**Files:**
- Create: `components/ui/SearchBar.tsx`

- [ ] **Step 1: Create SearchBar**

```tsx
import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2 mx-4 my-2">
      <Search size={18} color={BRAND.steel} />
      <TextInput
        className="flex-1 ml-2 text-base text-brand-navy"
        placeholder={placeholder}
        placeholderTextColor={BRAND.steel}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')}>
          <X size={18} color={BRAND.steel} />
        </Pressable>
      )}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/SearchBar.tsx
git commit -m "feat: add SearchBar component with clear button"
```

---

### Task 5: CategoryChips Component

**Files:**
- Create: `components/ui/CategoryChips.tsx`

- [ ] **Step 1: Create CategoryChips**

```tsx
import { FlatList, Pressable, Text } from 'react-native';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { CATEGORY_COLORS, BRAND } from '@/constants/colors';

type CategoryChipsProps = {
  selected: string | null;
  onSelect: (category: string | null) => void;
};

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  const categories = ['all', ...BUSINESS_CATEGORIES];

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={categories}
      keyExtractor={(item) => item}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      className="py-2"
      renderItem={({ item }) => {
        const isSelected = item === 'all' ? selected === null : selected === item;
        const label = item === 'all' ? 'All' : getCategoryLabel(item);
        const bgColor = isSelected
          ? item === 'all'
            ? BRAND.navy
            : (CATEGORY_COLORS[item] ?? BRAND.navy)
          : '#F3F4F6';
        const textColor = isSelected ? '#FFFFFF' : BRAND.navy;

        return (
          <Pressable
            onPress={() => onSelect(item === 'all' ? null : item)}
            className="rounded-full px-3 py-1.5"
            style={{ backgroundColor: bgColor }}
          >
            <Text className="text-sm font-medium" style={{ color: textColor }}>
              {label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/CategoryChips.tsx
git commit -m "feat: add CategoryChips horizontal filter component"
```

---

### Task 6: SegmentedControl Component

**Files:**
- Create: `components/ui/SegmentedControl.tsx`

- [ ] **Step 1: Create SegmentedControl**

```tsx
import { View, Pressable, Text } from 'react-native';
import { BRAND } from '@/constants/colors';

type SegmentedControlProps = {
  segments: string[];
  selected: string;
  onChange: (segment: string) => void;
};

export function SegmentedControl({ segments, selected, onChange }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-gray-100 rounded-lg mx-4 my-2 p-1">
      {segments.map((segment) => {
        const isSelected = segment === selected;
        return (
          <Pressable
            key={segment}
            onPress={() => onChange(segment)}
            className={`flex-1 rounded-md py-2 items-center ${
              isSelected ? 'bg-brand-navy shadow-sm' : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                isSelected ? 'text-white' : 'text-brand-steel'
              }`}
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ui/SegmentedControl.tsx
git commit -m "feat: add SegmentedControl tab filter component"
```

---

### Task 7: FAB, EmptyState, Modal Components

**Files:**
- Create: `components/ui/FAB.tsx`
- Create: `components/ui/EmptyState.tsx`
- Create: `components/ui/Modal.tsx`

- [ ] **Step 1: Create FAB**

```tsx
import { Pressable } from 'react-native';
import { Plus, type LucideIcon } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';

type FABProps = {
  onPress: () => void;
  icon?: LucideIcon;
};

export function FAB({ onPress, icon: Icon = Plus }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-6 w-14 h-14 rounded-full items-center justify-center shadow-lg"
      style={[
        { backgroundColor: BRAND.navy },
        ({ pressed }: { pressed: boolean }) => ({ opacity: pressed ? 0.8 : 1 }),
      ]}
    >
      <Icon size={24} color="#FFFFFF" />
    </Pressable>
  );
}
```

- [ ] **Step 2: Create EmptyState**

```tsx
import { View, Text } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { Button } from './Button';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon: Icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Icon size={48} color={BRAND.steel} />
      <Text className="text-lg font-semibold text-brand-navy mt-4">{title}</Text>
      <Text className="text-brand-steel text-center mt-2">{message}</Text>
      {actionLabel && onAction && (
        <Button onPress={onAction} className="mt-4">
          {actionLabel}
        </Button>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Create Modal**

```tsx
import { View, Text, Modal as RNModal, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from './Button';

type ModalAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
};

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: ModalAction[];
};

export function Modal({ visible, onClose, title, children, actions }: ModalProps) {
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center"
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-2xl mx-6 p-6 w-full max-w-sm"
          onPress={(e) => e.stopPropagation()}
        >
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-brand-navy">{title}</Text>
            <Pressable onPress={onClose}>
              <X size={20} color="#6B7280" />
            </Pressable>
          </View>
          {children}
          {actions && actions.length > 0 && (
            <View className="flex-row gap-3 mt-6">
              {actions.map((action) => (
                <View key={action.label} className="flex-1">
                  <Button
                    onPress={action.onPress}
                    variant={action.variant ?? 'primary'}
                  >
                    {action.label}
                  </Button>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/FAB.tsx components/ui/EmptyState.tsx components/ui/Modal.tsx
git commit -m "feat: add FAB, EmptyState, and Modal components"
```

---

### Task 8: Domain Components — BusinessCard, PostCard, PromotionCard

**Files:**
- Create: `components/tenant/BusinessCard.tsx`
- Create: `components/tenant/PostCard.tsx`
- Create: `components/tenant/PromotionCard.tsx`

- [ ] **Step 1: Create BusinessCard**

```tsx
import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { CATEGORY_COLORS } from '@/constants/colors';
import { getCategoryLabel } from '@/constants/categories';
import type { Business } from '@/services/businesses';

type BusinessCardProps = {
  business: Business;
  onPress?: () => void;
  compact?: boolean;
};

export function BusinessCard({ business, onPress, compact = false }: BusinessCardProps) {
  const categoryColor = CATEGORY_COLORS[business.category] ?? CATEGORY_COLORS.other;

  return (
    <Card onPress={onPress} className={compact ? 'p-3' : 'p-4'}>
      <View className="flex-row items-center">
        <Avatar
          imageUrl={business.logo_url}
          name={business.business_name}
          size={compact ? 40 : 56}
        />
        <View className="flex-1 ml-3">
          <Text className="text-base font-semibold text-brand-navy" numberOfLines={1}>
            {business.business_name}
          </Text>
          <View className="flex-row items-center mt-1 gap-2">
            <Badge
              label={getCategoryLabel(business.category)}
              color={{ bg: `${categoryColor}20`, text: categoryColor }}
            />
            {business.unit_number && (
              <Text className="text-xs text-brand-steel">Unit {business.unit_number}</Text>
            )}
          </View>
          {business.business_description && (
            <Text className="text-sm text-brand-steel mt-1" numberOfLines={2}>
              {business.business_description}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}
```

- [ ] **Step 2: Create PostCard**

```tsx
import { View, Text } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Post } from '@/services/posts';
import type { Business } from '@/services/businesses';

type PostCardProps = {
  post: Post;
  authorBusiness?: Business | null;
  onPress?: () => void;
};

const TYPE_COLORS = {
  announcement: { bg: '#DBEAFE', text: '#1D4ED8' },
  event: { bg: '#FEF3C7', text: '#92400E' },
  offer: { bg: '#D1FAE5', text: '#065F46' },
};

export function PostCard({ post, authorBusiness, onPress }: PostCardProps) {
  const typeColor = TYPE_COLORS[post.type] ?? TYPE_COLORS.announcement;
  const label = post.type.charAt(0).toUpperCase() + post.type.slice(1);
  const timeAgo = formatDistanceToNow(new Date(post.created_date), { addSuffix: true });

  return (
    <Card onPress={onPress} className="p-4">
      <View className="flex-row items-center mb-2">
        <Avatar
          imageUrl={authorBusiness?.logo_url}
          name={authorBusiness?.business_name ?? 'Unknown'}
          size={32}
        />
        <Text className="text-sm font-medium text-brand-navy ml-2 flex-1" numberOfLines={1}>
          {authorBusiness?.business_name ?? 'Unknown'}
        </Text>
        <Badge label={label} color={typeColor} />
      </View>
      <Text className="text-base font-semibold text-brand-navy">{post.title}</Text>
      {post.content && (
        <Text className="text-sm text-brand-steel mt-1" numberOfLines={3}>
          {post.content}
        </Text>
      )}
      <View className="flex-row items-center mt-2">
        {post.event_date && (
          <Text className="text-xs text-brand-blue mr-3">
            {new Date(post.event_date).toLocaleDateString()}
            {post.event_time ? ` at ${post.event_time}` : ''}
          </Text>
        )}
        <Text className="text-xs text-brand-steel">{timeAgo}</Text>
      </View>
    </Card>
  );
}
```

- [ ] **Step 3: Create PromotionCard**

```tsx
import { View, Text, Pressable, Linking } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/ui/Card';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import type { Post } from '@/services/posts';
import type { AdvertiserPromotion } from '@/services/advertiser-promotions';

type PromotionCardProps =
  | { variant: 'tenant'; data: Post; authorBusiness?: { business_name: string; logo_url: string | null }; onPress?: () => void }
  | { variant: 'advertiser'; data: AdvertiserPromotion; onPress?: () => void };

export function PromotionCard(props: PromotionCardProps) {
  if (props.variant === 'tenant') {
    const { data: post, authorBusiness, onPress } = props;
    const timeAgo = formatDistanceToNow(new Date(post.created_date), { addSuffix: true });

    return (
      <Card onPress={onPress} className="p-4">
        <View className="flex-row items-center mb-2">
          <Avatar
            imageUrl={authorBusiness?.logo_url}
            name={authorBusiness?.business_name ?? 'Unknown'}
            size={32}
          />
          <Text className="text-sm font-medium text-brand-navy ml-2 flex-1" numberOfLines={1}>
            {authorBusiness?.business_name ?? 'Unknown'}
          </Text>
        </View>
        <Text className="text-base font-semibold text-brand-navy">{post.title}</Text>
        {post.content && (
          <Text className="text-sm text-brand-steel mt-1" numberOfLines={2}>
            {post.content}
          </Text>
        )}
        <View className="flex-row items-center mt-2">
          {post.expiry_date && (
            <Text className="text-xs text-brand-blue">
              Expires {new Date(post.expiry_date).toLocaleDateString()}
            </Text>
          )}
          <Text className="text-xs text-brand-steel ml-auto">{timeAgo}</Text>
        </View>
      </Card>
    );
  }

  const { data: promo, onPress } = props;

  return (
    <Card onPress={onPress} className="p-4">
      <Badge
        label="Local Business"
        color={{ bg: '#EDE9FE', text: '#6D28D9' }}
        size="sm"
      />
      <Text className="text-base font-semibold text-brand-navy mt-2">{promo.headline}</Text>
      <Text className="text-sm text-brand-steel mt-1">{promo.business_name}</Text>
      {promo.description && (
        <Text className="text-sm text-brand-steel mt-1" numberOfLines={2}>
          {promo.description}
        </Text>
      )}
      {promo.cta_link && promo.cta_text && (
        <Pressable
          onPress={() => Linking.openURL(promo.cta_link!)}
          className="bg-brand-navy rounded-lg py-2 px-4 mt-3 self-start"
        >
          <Text className="text-white text-sm font-medium">{promo.cta_text}</Text>
        </Pressable>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/tenant/BusinessCard.tsx components/tenant/PostCard.tsx components/tenant/PromotionCard.tsx
git commit -m "feat: add BusinessCard, PostCard, PromotionCard domain components"
```

---

### Task 9: Admin Components — TenantRow, StatCard, PropertySelector

**Files:**
- Create: `components/admin/TenantRow.tsx`
- Create: `components/admin/StatCard.tsx`
- Create: `components/admin/PropertySelector.tsx`

- [ ] **Step 1: Create TenantRow**

```tsx
import { View, Text, Pressable } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { Profile } from '@/services/profiles';
import type { Business } from '@/services/businesses';

type TenantRowProps = {
  profile: Profile;
  business?: Business | null;
  onPress: () => void;
};

export function TenantRow({ profile, business, onPress }: TenantRowProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 px-4 border-b border-gray-100"
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <Avatar
        imageUrl={business?.logo_url}
        name={business?.business_name ?? profile.email}
        size={40}
      />
      <View className="flex-1 ml-3">
        <Text className="text-base font-medium text-brand-navy" numberOfLines={1}>
          {business?.business_name ?? 'No business'}
        </Text>
        <Text className="text-sm text-brand-steel" numberOfLines={1}>
          {profile.email}
        </Text>
      </View>
      <StatusBadge status={profile.status} />
    </Pressable>
  );
}
```

- [ ] **Step 2: Create StatCard**

```tsx
import { Text, Pressable } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { BRAND } from '@/constants/colors';

type StatCardProps = {
  label: string;
  value: number;
  icon?: LucideIcon;
  onPress?: () => void;
};

export function StatCard({ label, value, icon: Icon, onPress }: StatCardProps) {
  return (
    <Card onPress={onPress} className="p-4 flex-1">
      {Icon && <Icon size={20} color={BRAND.steel} />}
      <Text className="text-2xl font-bold text-brand-navy mt-1">{value}</Text>
      <Text className="text-sm text-brand-steel mt-0.5">{label}</Text>
    </Card>
  );
}
```

- [ ] **Step 3: Create PropertySelector**

```tsx
import { View, Text, Pressable, FlatList } from 'react-native';
import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react-native';
import { propertiesService, type Property } from '@/services/properties';
import { BRAND } from '@/constants/colors';

type PropertySelectorProps = {
  propertyIds: string[];
  selected: string | null;
  onSelect: (propertyId: string) => void;
};

export function PropertySelector({ propertyIds, selected, onSelect }: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    Promise.all(propertyIds.map((id) => propertiesService.getById(id)))
      .then(setProperties)
      .catch(() => {});
  }, [propertyIds]);

  const selectedProperty = properties.find((p) => p.id === selected);

  if (properties.length <= 1) {
    return (
      <View className="px-4 py-2">
        <Text className="text-sm text-brand-steel">Property</Text>
        <Text className="text-base font-medium text-brand-navy">
          {selectedProperty?.name ?? 'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View className="px-4 py-2">
      <Text className="text-sm text-brand-steel mb-1">Property</Text>
      <Pressable
        onPress={() => setOpen(!open)}
        className="flex-row items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
      >
        <Text className="text-base text-brand-navy">
          {selectedProperty?.name ?? 'Select property'}
        </Text>
        <ChevronDown size={18} color={BRAND.steel} />
      </Pressable>
      {open && (
        <View className="border border-gray-200 rounded-lg mt-1 bg-white">
          {properties.map((property) => (
            <Pressable
              key={property.id}
              onPress={() => {
                onSelect(property.id);
                setOpen(false);
              }}
              className={`px-3 py-2 ${property.id === selected ? 'bg-gray-50' : ''}`}
            >
              <Text className="text-base text-brand-navy">{property.name}</Text>
              <Text className="text-sm text-brand-steel">{property.city}, {property.state}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/TenantRow.tsx components/admin/StatCard.tsx components/admin/PropertySelector.tsx
git commit -m "feat: add TenantRow, StatCard, PropertySelector admin components"
```

---

### Task 10: React Query Hooks

**Files:**
- Create: `hooks/useBusinesses.ts`
- Create: `hooks/useBusiness.ts`
- Create: `hooks/usePosts.ts`
- Create: `hooks/usePromotions.ts`
- Create: `hooks/useAdvertiserPromotions.ts`
- Create: `hooks/useTenants.ts`
- Create: `hooks/useProperties.ts`
- Create: `hooks/useAdminStats.ts`

- [ ] **Step 1: Create useBusinesses**

```tsx
import { useQuery } from '@tanstack/react-query';
import { businessesService, type Business } from '@/services/businesses';

export function useBusinesses(propertyId: string, search?: string, category?: string | null) {
  return useQuery<Business[]>({
    queryKey: ['businesses', propertyId, { search, category }],
    queryFn: () => {
      const filters: Record<string, string> = { property_id: propertyId };
      if (category) filters.category = category;
      return businessesService.filter(filters, search);
    },
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 2: Create useBusiness**

```tsx
import { useQuery } from '@tanstack/react-query';
import { businessesService, type Business } from '@/services/businesses';

export function useBusiness(id: string) {
  return useQuery<Business>({
    queryKey: ['businesses', id],
    queryFn: () => businessesService.getById(id),
    enabled: !!id,
  });
}
```

- [ ] **Step 3: Create usePosts**

```tsx
import { useQuery } from '@tanstack/react-query';
import { postsService, type Post } from '@/services/posts';

export function usePosts(
  propertyId: string,
  type?: string | null,
  excludeType?: string | null
) {
  return useQuery<Post[]>({
    queryKey: ['posts', propertyId, { type, excludeType }],
    queryFn: async () => {
      const filters: Record<string, string> = { property_id: propertyId };
      if (type) filters.type = type;
      const posts = await postsService.filter(filters);
      if (excludeType) return posts.filter((p) => p.type !== excludeType);
      return posts;
    },
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 4: Create usePromotions**

```tsx
import { useQuery } from '@tanstack/react-query';
import { postsService, type Post } from '@/services/posts';
import { advertiserPromotionsService, type AdvertiserPromotion } from '@/services/advertiser-promotions';

type PromotionItem =
  | { kind: 'tenant'; data: Post }
  | { kind: 'advertiser'; data: AdvertiserPromotion };

export function usePromotions(propertyId: string, segment: 'All' | 'Tenant Offers' | 'Local Deals') {
  return useQuery<PromotionItem[]>({
    queryKey: ['promotions', propertyId, segment],
    queryFn: async () => {
      const now = new Date().toISOString().split('T')[0];
      const items: PromotionItem[] = [];

      if (segment !== 'Local Deals') {
        const offers = await postsService.filter({ property_id: propertyId, type: 'offer' });
        items.push(...offers.map((o) => ({ kind: 'tenant' as const, data: o })));
      }
      if (segment !== 'Tenant Offers') {
        const promos = await advertiserPromotionsService.filter({
          property_id: propertyId,
          approval_status: 'approved',
        });
        const active = promos.filter(
          (p) => (!p.start_date || p.start_date <= now) && (!p.end_date || p.end_date >= now)
        );
        items.push(...active.map((p) => ({ kind: 'advertiser' as const, data: p })));
      }

      return items.sort((a, b) => {
        const dateA = 'created_date' in a.data ? a.data.created_date : a.data.created_at;
        const dateB = 'created_date' in b.data ? b.data.created_date : b.data.created_at;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    },
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 5: Create useAdvertiserPromotions**

```tsx
import { useQuery } from '@tanstack/react-query';
import { advertiserPromotionsService, type AdvertiserPromotion } from '@/services/advertiser-promotions';

export function useAdvertiserPromotions(propertyId: string, status?: string) {
  return useQuery<AdvertiserPromotion[]>({
    queryKey: ['advertiserPromotions', propertyId, status],
    queryFn: () => {
      const filters: Record<string, string> = { property_id: propertyId };
      if (status) filters.approval_status = status;
      return advertiserPromotionsService.filter(filters);
    },
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 6: Create useTenants**

```tsx
import { useQuery } from '@tanstack/react-query';
import { profilesService, type Profile } from '@/services/profiles';
import { businessesService, type Business } from '@/services/businesses';

export type TenantWithBusiness = {
  profile: Profile;
  business: Business | null;
};

export function useTenants(propertyId: string, status?: string | null, search?: string) {
  return useQuery<TenantWithBusiness[]>({
    queryKey: ['tenants', propertyId, { status, search }],
    queryFn: async () => {
      const profiles = await profilesService.listByProperty(propertyId);
      const businesses = await businessesService.filter({ property_id: propertyId });

      let tenants: TenantWithBusiness[] = profiles.map((profile) => ({
        profile,
        business: businesses.find((b) => b.owner_email === profile.email) ?? null,
      }));

      if (status) {
        tenants = tenants.filter((t) => t.profile.status === status);
      }
      if (search) {
        const q = search.toLowerCase();
        tenants = tenants.filter(
          (t) =>
            t.profile.email.toLowerCase().includes(q) ||
            (t.business?.business_name.toLowerCase().includes(q) ?? false)
        );
      }

      return tenants;
    },
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 7: Create useProperties**

```tsx
import { useQuery } from '@tanstack/react-query';
import { propertiesService, type Property } from '@/services/properties';

export function useProperties(propertyIds: string[]) {
  return useQuery<Property[]>({
    queryKey: ['properties', propertyIds],
    queryFn: () => Promise.all(propertyIds.map((id) => propertiesService.getById(id))),
    enabled: propertyIds.length > 0,
  });
}
```

- [ ] **Step 8: Create useAdminStats**

```tsx
import { useQuery } from '@tanstack/react-query';
import { adminService } from '@/services/admin';

export function useAdminStats(propertyId: string) {
  return useQuery({
    queryKey: ['adminStats', propertyId],
    queryFn: () => adminService.getStats(propertyId),
    enabled: !!propertyId,
  });
}
```

- [ ] **Step 9: Verify TypeScript compiles**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && ./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 10: Commit**

```bash
git add hooks/
git commit -m "feat: add React Query hooks for all M2 data sources"
```

---

## Phase 2: Tenant Screens

### Task 11: Directory Screen

**Files:**
- Modify: `app/(tabs)/directory.tsx` (replace placeholder)

- [ ] **Step 1: Implement directory screen**

Replace entire contents of `app/(tabs)/directory.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BusinessCard } from '@/components/tenant/BusinessCard';
import { useAuth } from '@/lib/AuthContext';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useProperties } from '@/hooks/useProperties';
import { useDebounce } from '@/hooks/useDebounce';

export default function DirectoryScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';
  const { data: properties } = useProperties(propertyIds);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: businesses, isLoading, refetch } = useBusinesses(
    propertyId,
    debouncedSearch || undefined,
    category
  );

  const propertyName = properties?.[0]?.name ?? 'Directory';

  if (isLoading && !businesses) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search businesses..." />
      </GradientHeader>
      <CategoryChips selected={category} onSelect={setCategory} />
      <FlatList
        data={businesses ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <BusinessCard
            business={item}
            compact
            onPress={() => router.push(`/directory/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon={Building2}
            title="No businesses found"
            message={search || category ? 'Try adjusting your filters' : 'No businesses in this property yet'}
          />
        }
        onRefresh={refetch}
        refreshing={false}
      />
    </View>
  );
}
```

- [ ] **Step 2: Create useDebounce hook**

Create `hooks/useDebounce.ts`:

```tsx
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/directory.tsx hooks/useDebounce.ts
git commit -m "feat: implement Directory screen with search and category filters"
```

---

### Task 12: Directory Detail Screen

**Files:**
- Create: `app/(tabs)/directory/[id].tsx`

- [ ] **Step 1: Create directory detail screen**

```tsx
import { View, Text, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Phone, Mail, Globe, Share2, ArrowLeft } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Sharing from 'expo-sharing';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CATEGORY_COLORS, BRAND } from '@/constants/colors';
import { getCategoryLabel } from '@/constants/categories';
import { useBusiness } from '@/hooks/useBusiness';
import { useAuth } from '@/lib/AuthContext';

export default function DirectoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: business, isLoading } = useBusiness(id);

  if (isLoading || !business) return <LoadingScreen />;

  const categoryColor = CATEGORY_COLORS[business.category] ?? CATEGORY_COLORS.other;
  const isOwnBusiness = business.owner_email === user?.email;
  const deepLink = `unit://directory/${business.id}`;

  const handleShare = async () => {
    const text = `${business.business_name}\n${business.category}\n${business.contact_phone ?? ''}\n${business.contact_email ?? ''}`;
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(text);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="bg-brand-navy px-4 pt-12 pb-6">
        <Pressable onPress={() => router.back()} className="mb-4">
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <View className="items-center">
          <Avatar imageUrl={business.logo_url} name={business.business_name} size={80} />
          <Text className="text-xl font-bold text-white mt-3">{business.business_name}</Text>
          <Badge
            label={getCategoryLabel(business.category)}
            color={{ bg: `${categoryColor}40`, text: '#FFFFFF' }}
            size="md"
          />
        </View>
      </View>

      <View className="p-4">
        {business.business_description && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-brand-steel mb-1">About</Text>
            <Text className="text-base text-brand-navy">{business.business_description}</Text>
          </View>
        )}

        <View className="mb-4">
          <Text className="text-sm font-medium text-brand-steel mb-2">Contact</Text>
          {business.unit_number && (
            <Text className="text-base text-brand-navy mb-1">Unit {business.unit_number}</Text>
          )}
          <View className="flex-row gap-3 mt-1">
            {business.contact_phone && (
              <Pressable
                onPress={() => Linking.openURL(`tel:${business.contact_phone}`)}
                className="flex-row items-center bg-gray-100 rounded-lg px-4 py-2"
              >
                <Phone size={16} color={BRAND.navy} />
                <Text className="text-sm text-brand-navy ml-2">Call</Text>
              </Pressable>
            )}
            {business.contact_email && (
              <Pressable
                onPress={() => Linking.openURL(`mailto:${business.contact_email}`)}
                className="flex-row items-center bg-gray-100 rounded-lg px-4 py-2"
              >
                <Mail size={16} color={BRAND.navy} />
                <Text className="text-sm text-brand-navy ml-2">Email</Text>
              </Pressable>
            )}
            {business.website && (
              <Pressable
                onPress={() => Linking.openURL(business.website!)}
                className="flex-row items-center bg-gray-100 rounded-lg px-4 py-2"
              >
                <Globe size={16} color={BRAND.navy} />
                <Text className="text-sm text-brand-navy ml-2">Web</Text>
              </Pressable>
            )}
          </View>
        </View>

        <View className="items-center my-4 py-4 border-t border-gray-100">
          <QRCode value={deepLink} size={150} />
          <Text className="text-xs text-brand-steel mt-2">Scan to view this business</Text>
        </View>

        <Pressable onPress={handleShare} className="flex-row items-center justify-center py-3">
          <Share2 size={18} color={BRAND.navy} />
          <Text className="text-brand-navy font-medium ml-2">Share</Text>
        </Pressable>

        {isOwnBusiness && (
          <Button onPress={() => router.push('/profile/edit')} className="mt-4">
            Edit Profile
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(tabs)/directory/[id].tsx
git commit -m "feat: implement Directory detail screen with QR code and share"
```

---

### Task 13: Profile Screen + Edit Screen

**Files:**
- Modify: `app/(tabs)/profile.tsx` (replace placeholder)
- Create: `app/(tabs)/profile/edit.tsx`

- [ ] **Step 1: Implement profile screen**

Replace entire contents of `app/(tabs)/profile.tsx`:

```tsx
import { View, Text, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import QRCode from 'react-native-qrcode-svg';
import { Share2 } from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Button } from '@/components/ui/Button';
import { BusinessCard } from '@/components/tenant/BusinessCard';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useProperties } from '@/hooks/useProperties';
import { BRAND } from '@/constants/colors';

export default function ProfileScreen() {
  const { user, logout, propertyIds } = useAuth();
  const { data: business, isLoading } = useCurrentUser();
  const { data: properties } = useProperties(propertyIds);

  if (isLoading) return <LoadingScreen />;

  const propertyName = properties?.[0]?.name ?? '';

  return (
    <ScrollView className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Profile</Text>
        <Text className="text-brand-steel text-sm">{user?.email}</Text>
      </GradientHeader>

      <View className="p-4">
        {business && (
          <>
            <BusinessCard business={business} />

            <View className="items-center my-6">
              <QRCode value={`unit://directory/${business.id}`} size={120} />
              <Text className="text-xs text-brand-steel mt-2">Your business QR code</Text>
            </View>

            <Button
              onPress={() => router.push('/profile/edit')}
              variant="secondary"
              className="mb-3"
            >
              Edit Profile
            </Button>
          </>
        )}

        <View className="mt-6 border-t border-gray-100 pt-4">
          <Text className="text-sm font-medium text-brand-steel mb-3">Settings</Text>

          {propertyName && (
            <View className="flex-row justify-between py-2">
              <Text className="text-brand-steel">Property</Text>
              <Text className="text-brand-navy">{propertyName}</Text>
            </View>
          )}
          <View className="flex-row justify-between py-2">
            <Text className="text-brand-steel">App Version</Text>
            <Text className="text-brand-navy">
              {Constants.expoConfig?.version ?? '1.0.0'}
            </Text>
          </View>

          <Button onPress={logout} variant="destructive" className="mt-6">
            Log Out
          </Button>
        </View>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Create profile edit screen**

Create `app/(tabs)/profile/edit.tsx`:

```tsx
import { View, ScrollView, Text, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Camera } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { businessesService } from '@/services/businesses';
import { storageService } from '@/services/storage';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { BRAND } from '@/constants/colors';

const editSchema = z.object({
  business_name: z.string().min(1, 'Business name is required'),
  category: z.string().min(1, 'Category is required'),
  business_description: z.string().optional(),
  contact_name: z.string().optional(),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
});

type EditForm = z.infer<typeof editSchema>;

export default function ProfileEditScreen() {
  const { data: business } = useCurrentUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [logoUri, setLogoUri] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      business_name: business?.business_name ?? '',
      category: business?.category ?? '',
      business_description: business?.business_description ?? '',
      contact_name: business?.contact_name ?? '',
      contact_phone: business?.contact_phone ?? '',
      contact_email: business?.contact_email ?? '',
      website: business?.website ?? '',
    },
  });

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

  const onSubmit = async (data: EditForm) => {
    if (!business) return;
    setLoading(true);
    try {
      let logo_url = business.logo_url;
      if (logoUri) {
        const { file_url } = await storageService.uploadFile(logoUri);
        logo_url = file_url;
      }
      await businessesService.update(business.id, { ...data, logo_url });
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      await queryClient.invalidateQueries({ queryKey: ['businesses'] });
      Toast.show({ type: 'success', text1: 'Profile updated' });
      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Edit Profile</Text>
      </GradientHeader>

      <View className="p-4">
        <Pressable onPress={pickImage} className="items-center mb-6">
          <Avatar
            imageUrl={logoUri ?? business?.logo_url}
            name={business?.business_name ?? ''}
            size={80}
          />
          <View className="flex-row items-center mt-2">
            <Camera size={14} color={BRAND.steel} />
            <Text className="text-sm text-brand-steel ml-1">Change Logo</Text>
          </View>
        </Pressable>

        <Controller
          control={control}
          name="business_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input label="Business Name" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.business_name?.message} />
          )}
        />

        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View className="mb-4">
              <Text className="text-sm font-medium text-brand-navy mb-1">Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {BUSINESS_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat}
                      onPress={() => onChange(cat)}
                      className={`px-3 py-1.5 rounded-full ${cat === value ? 'bg-brand-navy' : 'bg-gray-100'}`}
                    >
                      <Text className={`text-sm ${cat === value ? 'text-white' : 'text-brand-navy'}`}>
                        {getCategoryLabel(cat)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              {errors.category && <Text className="text-red-500 text-xs mt-1">{errors.category.message}</Text>}
            </View>
          )}
        />

        <Controller control={control} name="business_description" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Description" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} multiline numberOfLines={4} />
        )} />
        <Controller control={control} name="contact_name" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Contact Name" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} />
        )} />
        <Controller control={control} name="contact_phone" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Phone" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} keyboardType="phone-pad" />
        )} />
        <Controller control={control} name="contact_email" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Email" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} error={errors.contact_email?.message} keyboardType="email-address" autoCapitalize="none" />
        )} />
        <Controller control={control} name="website" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Website" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} error={errors.website?.message} autoCapitalize="none" />
        )} />

        <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4">
          Save Changes
        </Button>
        <Button onPress={() => router.back()} variant="ghost" className="mt-2">
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/profile.tsx app/(tabs)/profile/edit.tsx
git commit -m "feat: implement Profile screen with edit form and logo upload"
```

---

### Task 14: Promotions Screen + Create Offer

**Files:**
- Modify: `app/(tabs)/promotions.tsx` (replace placeholder)
- Create: `app/(tabs)/promotions/create.tsx`

- [ ] **Step 1: Implement promotions screen**

Replace entire contents of `app/(tabs)/promotions.tsx`:

```tsx
import { useState } from 'react';
import { View, FlatList } from 'react-native';
import { router } from 'expo-router';
import { Megaphone } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FAB } from '@/components/ui/FAB';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PromotionCard } from '@/components/tenant/PromotionCard';
import { useAuth } from '@/lib/AuthContext';
import { usePromotions } from '@/hooks/usePromotions';
import { useBusinesses } from '@/hooks/useBusinesses';
import { Text } from 'react-native';

const SEGMENTS = ['All', 'Tenant Offers', 'Local Deals'] as const;

export default function PromotionsScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';
  const [segment, setSegment] = useState<(typeof SEGMENTS)[number]>('All');

  const { data: items, isLoading, refetch } = usePromotions(propertyId, segment);
  const { data: businesses } = useBusinesses(propertyId);

  if (isLoading && !items) return <LoadingScreen />;

  const getAuthorBusiness = (businessId: string) =>
    businesses?.find((b) => b.id === businessId);

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Promotions</Text>
      </GradientHeader>
      <SegmentedControl
        segments={[...SEGMENTS]}
        selected={segment}
        onChange={(s) => setSegment(s as (typeof SEGMENTS)[number])}
      />
      <FlatList
        data={items ?? []}
        keyExtractor={(item) => item.data.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) =>
          item.kind === 'tenant' ? (
            <PromotionCard
              variant="tenant"
              data={item.data}
              authorBusiness={getAuthorBusiness(item.data.business_id) ?? undefined}
            />
          ) : (
            <PromotionCard variant="advertiser" data={item.data} />
          )
        }
        ListEmptyComponent={
          <EmptyState icon={Megaphone} title="No promotions" message="Check back later for offers and deals" />
        }
        onRefresh={refetch}
        refreshing={false}
      />
      <FAB onPress={() => router.push('/promotions/create')} />
    </View>
  );
}
```

- [ ] **Step 2: Create offer form**

Create `app/(tabs)/promotions/create.tsx`:

```tsx
import { View, ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { postsService } from '@/services/posts';
import { storageService } from '@/services/storage';

const offerSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  expiry_date: z.string().optional(),
});

type OfferForm = z.infer<typeof offerSchema>;

export default function CreateOfferScreen() {
  const { propertyIds } = useAuth();
  const { data: business } = useCurrentUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { control, handleSubmit, formState: { errors } } = useForm<OfferForm>({
    resolver: zodResolver(offerSchema),
    defaultValues: { title: '', description: '', expiry_date: '' },
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const onSubmit = async (data: OfferForm) => {
    if (!business) return;
    setLoading(true);
    try {
      let image_url: string | undefined;
      if (imageUri) {
        const { file_url } = await storageService.uploadFile(imageUri);
        image_url = file_url;
      }
      await postsService.create({
        property_id: propertyIds[0],
        business_id: business.id,
        type: 'offer',
        title: data.title,
        content: data.description,
        expiry_date: data.expiry_date || null,
        image_url: image_url ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ['promotions'] });
      Toast.show({ type: 'success', text1: 'Offer posted!' });
      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to create offer', text2: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Post an Offer</Text>
      </GradientHeader>
      <View className="p-4">
        <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Title" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.title?.message} />
        )} />
        <Controller control={control} name="description" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Description" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.description?.message} multiline numberOfLines={4} />
        )} />
        <Controller control={control} name="expiry_date" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Expiry Date (YYYY-MM-DD)" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} placeholder="2026-05-01" />
        )} />
        <Button onPress={pickImage} variant="secondary" className="mt-2">
          {imageUri ? 'Change Image' : 'Add Image (Optional)'}
        </Button>
        <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4">
          Post Offer
        </Button>
        <Button onPress={() => router.back()} variant="ghost" className="mt-2">
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/promotions.tsx app/(tabs)/promotions/create.tsx
git commit -m "feat: implement Promotions screen with combined feed and create offer"
```

---

### Task 15: Community Screen + Create Post

**Files:**
- Modify: `app/(tabs)/community.tsx` (replace placeholder)
- Create: `app/(tabs)/community/create.tsx`

- [ ] **Step 1: Implement community screen**

Replace entire contents of `app/(tabs)/community.tsx`:

```tsx
import { useState } from 'react';
import { View, FlatList, Text } from 'react-native';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FAB } from '@/components/ui/FAB';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PostCard } from '@/components/tenant/PostCard';
import { useAuth } from '@/lib/AuthContext';
import { usePosts } from '@/hooks/usePosts';
import { useBusinesses } from '@/hooks/useBusinesses';

const SEGMENTS = ['All', 'Announcements', 'Events'] as const;
const TYPE_MAP: Record<string, string | undefined> = {
  All: undefined,
  Announcements: 'announcement',
  Events: 'event',
};

export default function CommunityScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';
  const [segment, setSegment] = useState<string>('All');

  const typeFilter = TYPE_MAP[segment] ?? undefined;
  const { data: posts, isLoading, refetch } = usePosts(
    propertyId,
    typeFilter ?? undefined,
    typeFilter ? undefined : 'offer'
  );
  const { data: businesses } = useBusinesses(propertyId);

  if (isLoading && !posts) return <LoadingScreen />;

  const getAuthor = (businessId: string) =>
    businesses?.find((b) => b.id === businessId);

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Community</Text>
      </GradientHeader>
      <SegmentedControl
        segments={[...SEGMENTS]}
        selected={segment}
        onChange={setSegment}
      />
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <PostCard post={item} authorBusiness={getAuthor(item.business_id)} />
        )}
        ListEmptyComponent={
          <EmptyState icon={Users} title="No posts yet" message="Be the first to share with your community" />
        }
        onRefresh={refetch}
        refreshing={false}
      />
      <FAB onPress={() => router.push('/community/create')} />
    </View>
  );
}
```

- [ ] **Step 2: Create post form**

Create `app/(tabs)/community/create.tsx`:

```tsx
import { View, ScrollView, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/lib/AuthContext';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { postsService } from '@/services/posts';
import { storageService } from '@/services/storage';

const postSchema = z.object({
  type: z.enum(['announcement', 'event']),
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  event_date: z.string().optional(),
  event_time: z.string().optional(),
});

type PostForm = z.infer<typeof postSchema>;

export default function CreatePostScreen() {
  const { propertyIds } = useAuth();
  const { data: business } = useCurrentUser();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const { control, handleSubmit, watch, formState: { errors } } = useForm<PostForm>({
    resolver: zodResolver(postSchema),
    defaultValues: { type: 'announcement', title: '', content: '', event_date: '', event_time: '' },
  });

  const postType = watch('type');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const onSubmit = async (data: PostForm) => {
    if (!business) return;
    setLoading(true);
    try {
      let image_url: string | undefined;
      if (imageUri) {
        const { file_url } = await storageService.uploadFile(imageUri);
        image_url = file_url;
      }
      await postsService.create({
        property_id: propertyIds[0],
        business_id: business.id,
        type: data.type,
        title: data.title,
        content: data.content,
        event_date: data.type === 'event' ? data.event_date || null : null,
        event_time: data.type === 'event' ? data.event_time || null : null,
        image_url: image_url ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      Toast.show({ type: 'success', text1: 'Post created!' });
      router.back();
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed to create post', text2: String(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">New Post</Text>
      </GradientHeader>
      <View className="p-4">
        <Controller control={control} name="type" render={({ field: { onChange, value } }) => (
          <SegmentedControl
            segments={['announcement', 'event']}
            selected={value}
            onChange={(v) => onChange(v)}
          />
        )} />
        <Controller control={control} name="title" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Title" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.title?.message} />
        )} />
        <Controller control={control} name="content" render={({ field: { onChange, onBlur, value } }) => (
          <Input label="Content" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.content?.message} multiline numberOfLines={6} />
        )} />
        {postType === 'event' && (
          <>
            <Controller control={control} name="event_date" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Event Date (YYYY-MM-DD)" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} placeholder="2026-05-01" />
            )} />
            <Controller control={control} name="event_time" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Event Time" value={value ?? ''} onBlur={onBlur} onChangeText={onChange} placeholder="6:00 PM" />
            )} />
          </>
        )}
        <Button onPress={pickImage} variant="secondary" className="mt-2">
          {imageUri ? 'Change Image' : 'Add Image (Optional)'}
        </Button>
        <Button onPress={handleSubmit(onSubmit)} loading={loading} className="mt-4">
          Create Post
        </Button>
        <Button onPress={() => router.back()} variant="ghost" className="mt-2">
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/community.tsx app/(tabs)/community/create.tsx
git commit -m "feat: implement Community screen with posts feed and create form"
```

---

## Phase 3: Admin Screens

### Task 16: Admin Dashboard

**Files:**
- Modify: `app/(admin)/index.tsx` (replace placeholder)

- [ ] **Step 1: Implement admin dashboard**

Replace entire contents of `app/(admin)/index.tsx`:

```tsx
import { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Users, UserCheck, Clock, Megaphone } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { StatCard } from '@/components/admin/StatCard';
import { PostCard } from '@/components/tenant/PostCard';
import { useAuth } from '@/lib/AuthContext';
import { useAdminStats } from '@/hooks/useAdminStats';
import { usePosts } from '@/hooks/usePosts';
import { useBusinesses } from '@/hooks/useBusinesses';

export default function AdminDashboardScreen() {
  const { propertyIds } = useAuth();
  const [selectedProperty, setSelectedProperty] = useState(propertyIds[0] ?? '');

  const { data: stats, isLoading: statsLoading } = useAdminStats(selectedProperty);
  const { data: recentPosts } = usePosts(selectedProperty);
  const { data: businesses } = useBusinesses(selectedProperty);

  if (statsLoading) return <LoadingScreen />;

  const last10Posts = (recentPosts ?? []).slice(0, 10);

  return (
    <ScrollView className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Admin Dashboard</Text>
      </GradientHeader>

      <PropertySelector
        propertyIds={propertyIds}
        selected={selectedProperty}
        onSelect={setSelectedProperty}
      />

      <View className="flex-row gap-3 px-4 mt-2">
        <StatCard label="Total Tenants" value={stats?.totalTenants ?? 0} icon={Users} />
        <StatCard label="Active" value={stats?.activeAccounts ?? 0} icon={UserCheck} />
      </View>
      <View className="flex-row gap-3 px-4 mt-3">
        <StatCard label="Pending Invites" value={stats?.pendingInvites ?? 0} icon={Clock} />
        <StatCard label="Promotions (30d)" value={stats?.activePromotions ?? 0} icon={Megaphone} />
      </View>

      <Pressable
        onPress={() => router.push('/(admin)/advertisers')}
        className="mx-4 mt-4 bg-amber-50 rounded-lg p-3"
      >
        <Text className="text-amber-800 font-medium">View Pending Approvals</Text>
      </Pressable>

      <View className="px-4 mt-6 mb-4">
        <Text className="text-lg font-semibold text-brand-navy mb-3">Recent Activity</Text>
        {last10Posts.map((post) => (
          <View key={post.id} className="mb-2">
            <PostCard
              post={post}
              authorBusiness={businesses?.find((b) => b.id === post.business_id)}
            />
          </View>
        ))}
        {last10Posts.length === 0 && (
          <Text className="text-brand-steel text-center py-4">No recent activity</Text>
        )}
      </View>
    </ScrollView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/index.tsx
git commit -m "feat: implement Admin Dashboard with stats and recent activity"
```

---

### Task 17: Admin Tenants Screen

**Files:**
- Create: `app/(admin)/tenants.tsx`

- [ ] **Step 1: Create tenants management screen**

```tsx
import { useState } from 'react';
import { View, Text, FlatList, ScrollView, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Users } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { TenantRow } from '@/components/admin/TenantRow';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { useAuth } from '@/lib/AuthContext';
import { useTenants } from '@/hooks/useTenants';
import { useDebounce } from '@/hooks/useDebounce';
import { adminService } from '@/services/admin';
import { profilesService } from '@/services/profiles';
import { businessesService } from '@/services/businesses';

const STATUS_SEGMENTS = ['All', 'Invited', 'Active', 'Inactive'];

export default function AdminTenantsScreen() {
  const { propertyIds } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState(propertyIds[0] ?? '');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ email: '', business_name: '', category: '' });
  const [addLoading, setAddLoading] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const statusParam = statusFilter === 'All' ? undefined : statusFilter.toLowerCase();
  const { data: tenants, isLoading, refetch } = useTenants(selectedProperty, statusParam, debouncedSearch);

  const handleAddTenant = async () => {
    if (!addForm.email || !addForm.business_name || !addForm.category) {
      Toast.show({ type: 'error', text1: 'Fill in all required fields' });
      return;
    }
    setAddLoading(true);
    try {
      const result = await adminService.inviteTenants([{
        email: addForm.email,
        business_name: addForm.business_name,
        category: addForm.category,
        property_id: selectedProperty,
      }]);
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      Toast.show({
        type: result.imported > 0 ? 'success' : 'error',
        text1: result.imported > 0 ? 'Tenant invited' : 'Invite failed',
        text2: result.failed.length > 0 ? result.failed[0].reason : undefined,
      });
      setShowAddModal(false);
      setAddForm({ email: '', business_name: '', category: '' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: String(err) });
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (profileId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'inactive') {
        await profilesService.reactivate(profileId);
      } else {
        await profilesService.disable(profileId);
      }
      await queryClient.invalidateQueries({ queryKey: ['tenants'] });
      Toast.show({ type: 'success', text1: 'Status updated' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: String(err) });
    }
  };

  if (isLoading && !tenants) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Tenants</Text>
      </GradientHeader>

      <PropertySelector propertyIds={propertyIds} selected={selectedProperty} onSelect={setSelectedProperty} />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search tenants..." />
      <SegmentedControl segments={STATUS_SEGMENTS} selected={statusFilter} onChange={setStatusFilter} />

      <Button onPress={() => setShowAddModal(true)} className="mx-4 mt-2">
        Add Tenant
      </Button>

      {Platform.OS === 'web' ? (
        <Text className="text-brand-steel text-sm text-center mt-2">CSV import available on web admin panel</Text>
      ) : (
        <Text className="text-brand-steel text-xs text-center mt-1 px-4">For bulk import, use the admin web panel</Text>
      )}

      <FlatList
        data={tenants ?? []}
        keyExtractor={(item) => item.profile.id}
        renderItem={({ item }) => (
          <TenantRow
            profile={item.profile}
            business={item.business}
            onPress={() => handleToggleStatus(item.profile.id, item.profile.status)}
          />
        )}
        ListEmptyComponent={
          <EmptyState icon={Users} title="No tenants found" message="Add tenants or adjust your filters" />
        }
        onRefresh={refetch}
        refreshing={false}
      />

      <Modal visible={showAddModal} onClose={() => setShowAddModal(false)} title="Add Tenant">
        <Input label="Email" value={addForm.email} onChangeText={(v) => setAddForm({ ...addForm, email: v })} keyboardType="email-address" autoCapitalize="none" />
        <Input label="Business Name" value={addForm.business_name} onChangeText={(v) => setAddForm({ ...addForm, business_name: v })} />
        <Input label="Category" value={addForm.category} onChangeText={(v) => setAddForm({ ...addForm, category: v })} />
        <Button onPress={handleAddTenant} loading={addLoading} className="mt-4">
          Invite Tenant
        </Button>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/tenants.tsx
git commit -m "feat: implement Admin Tenants screen with search, filter, add"
```

---

### Task 18: Admin Advertisers Screen

**Files:**
- Create: `app/(admin)/advertisers.tsx`

- [ ] **Step 1: Create advertisers management screen**

```tsx
import { useState } from 'react';
import { View, Text, FlatList, ScrollView } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Megaphone } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card } from '@/components/ui/Card';
import { PropertySelector } from '@/components/admin/PropertySelector';
import { useAuth } from '@/lib/AuthContext';
import { useAdvertiserPromotions } from '@/hooks/useAdvertiserPromotions';
import { advertiserPromotionsService } from '@/services/advertiser-promotions';

const SEGMENTS = ['Pending', 'Approved', 'Rejected'];

export default function AdminAdvertisersScreen() {
  const { propertyIds, user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedProperty, setSelectedProperty] = useState(propertyIds[0] ?? '');
  const [segment, setSegment] = useState('Pending');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ business_name: '', headline: '', description: '', cta_link: '' });
  const [addLoading, setAddLoading] = useState(false);

  const { data: promotions, isLoading, refetch } = useAdvertiserPromotions(
    selectedProperty,
    segment.toLowerCase()
  );

  const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
    try {
      await advertiserPromotionsService.updateStatus(id, newStatus, user?.id ?? '');
      await queryClient.invalidateQueries({ queryKey: ['advertiserPromotions'] });
      Toast.show({ type: 'success', text1: `Promotion ${newStatus}` });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: String(err) });
    }
  };

  const handleAddPromotion = async () => {
    if (!addForm.business_name || !addForm.headline) {
      Toast.show({ type: 'error', text1: 'Business name and headline required' });
      return;
    }
    setAddLoading(true);
    try {
      await advertiserPromotionsService.create({
        property_id: selectedProperty,
        business_name: addForm.business_name,
        headline: addForm.headline,
        description: addForm.description || null,
        cta_link: addForm.cta_link || null,
        approval_status: 'approved',
        approved_by: user?.id ?? null,
      });
      await queryClient.invalidateQueries({ queryKey: ['advertiserPromotions'] });
      Toast.show({ type: 'success', text1: 'Promotion created (auto-approved)' });
      setShowAddModal(false);
      setAddForm({ business_name: '', headline: '', description: '', cta_link: '' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: String(err) });
    } finally {
      setAddLoading(false);
    }
  };

  if (isLoading && !promotions) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Advertisers</Text>
      </GradientHeader>

      <PropertySelector propertyIds={propertyIds} selected={selectedProperty} onSelect={setSelectedProperty} />
      <SegmentedControl segments={SEGMENTS} selected={segment} onChange={setSegment} />

      <Button onPress={() => setShowAddModal(true)} className="mx-4 mt-2">
        Add Promotion
      </Button>

      <FlatList
        data={promotions ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Card className="p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-brand-navy flex-1">{item.headline}</Text>
              <StatusBadge status={item.approval_status} />
            </View>
            <Text className="text-sm text-brand-steel">{item.business_name}</Text>
            {item.description && (
              <Text className="text-sm text-brand-steel mt-1" numberOfLines={2}>{item.description}</Text>
            )}
            <View className="flex-row gap-2 mt-3">
              {item.approval_status === 'pending' && (
                <>
                  <Button onPress={() => handleStatusChange(item.id, 'approved')} className="flex-1">Approve</Button>
                  <Button onPress={() => handleStatusChange(item.id, 'rejected')} variant="destructive" className="flex-1">Reject</Button>
                </>
              )}
              {item.approval_status === 'approved' && (
                <Button onPress={() => handleStatusChange(item.id, 'rejected')} variant="destructive" className="flex-1">Revoke</Button>
              )}
              {item.approval_status === 'rejected' && (
                <Button onPress={() => handleStatusChange(item.id, 'approved')} className="flex-1">Approve</Button>
              )}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon={Megaphone} title={`No ${segment.toLowerCase()} promotions`} message="Advertiser promotions will appear here" />
        }
        onRefresh={refetch}
        refreshing={false}
      />

      <Modal visible={showAddModal} onClose={() => setShowAddModal(false)} title="Add Promotion">
        <Input label="Business Name" value={addForm.business_name} onChangeText={(v) => setAddForm({ ...addForm, business_name: v })} />
        <Input label="Headline" value={addForm.headline} onChangeText={(v) => setAddForm({ ...addForm, headline: v })} />
        <Input label="Description" value={addForm.description} onChangeText={(v) => setAddForm({ ...addForm, description: v })} multiline />
        <Input label="CTA Link (URL)" value={addForm.cta_link} onChangeText={(v) => setAddForm({ ...addForm, cta_link: v })} autoCapitalize="none" />
        <Button onPress={handleAddPromotion} loading={addLoading} className="mt-4">
          Create (Auto-Approved)
        </Button>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/advertisers.tsx
git commit -m "feat: implement Admin Advertisers screen with approve/reject flow"
```

---

### Task 19: Admin Properties Screen

**Files:**
- Create: `app/(admin)/properties.tsx`

- [ ] **Step 1: Create properties management screen**

```tsx
import { useState } from 'react';
import { View, Text, FlatList } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { Building } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/AuthContext';
import { useProperties } from '@/hooks/useProperties';
import { propertiesService } from '@/services/properties';
import { adminService } from '@/services/admin';

export default function AdminPropertiesScreen() {
  const { propertyIds } = useAuth();
  const queryClient = useQueryClient();
  const { data: properties, isLoading } = useProperties(propertyIds);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', address: '', city: '', state: '', type: '', total_units: '' });
  const [addLoading, setAddLoading] = useState(false);

  const handleAddProperty = async () => {
    if (!addForm.name || !addForm.address) {
      Toast.show({ type: 'error', text1: 'Name and address required' });
      return;
    }
    setAddLoading(true);
    try {
      const property = await propertiesService.create({
        name: addForm.name,
        address: addForm.address,
        city: addForm.city,
        state: addForm.state,
        type: addForm.type || 'commercial',
        total_units: parseInt(addForm.total_units) || 0,
        image_url: null,
      });
      await adminService.addPropertyToAdmin(property.id);
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      Toast.show({ type: 'success', text1: 'Property created' });
      setShowAddModal(false);
      setAddForm({ name: '', address: '', city: '', state: '', type: '', total_units: '' });
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Failed', text2: String(err) });
    } finally {
      setAddLoading(false);
    }
  };

  if (isLoading) return <LoadingScreen />;

  return (
    <View className="flex-1 bg-white">
      <GradientHeader>
        <Text className="text-2xl font-bold text-white">Properties</Text>
      </GradientHeader>

      <Button onPress={() => setShowAddModal(true)} className="mx-4 mt-4">
        Add Property
      </Button>

      <FlatList
        data={properties ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, flexGrow: 1 }}
        renderItem={({ item }) => (
          <Card className="p-4">
            <Text className="text-base font-semibold text-brand-navy">{item.name}</Text>
            <Text className="text-sm text-brand-steel mt-1">{item.address}</Text>
            <Text className="text-sm text-brand-steel">{item.city}, {item.state}</Text>
            <Text className="text-xs text-brand-steel mt-2">{item.total_units} units</Text>
          </Card>
        )}
        ListEmptyComponent={
          <EmptyState icon={Building} title="No properties" message="Add your first property" />
        }
      />

      <Modal visible={showAddModal} onClose={() => setShowAddModal(false)} title="Add Property">
        <Input label="Name" value={addForm.name} onChangeText={(v) => setAddForm({ ...addForm, name: v })} />
        <Input label="Address" value={addForm.address} onChangeText={(v) => setAddForm({ ...addForm, address: v })} />
        <Input label="City" value={addForm.city} onChangeText={(v) => setAddForm({ ...addForm, city: v })} />
        <Input label="State" value={addForm.state} onChangeText={(v) => setAddForm({ ...addForm, state: v })} />
        <Input label="Type" value={addForm.type} onChangeText={(v) => setAddForm({ ...addForm, type: v })} placeholder="commercial" />
        <Input label="Total Units" value={addForm.total_units} onChangeText={(v) => setAddForm({ ...addForm, total_units: v })} keyboardType="number-pad" />
        <Button onPress={handleAddProperty} loading={addLoading} className="mt-4">
          Create Property
        </Button>
      </Modal>
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(admin)/properties.tsx
git commit -m "feat: implement Admin Properties screen with add/view"
```

---

## Phase 4: Integration & Wiring

### Task 20: Admin Stack Navigation + Final Wiring

**Files:**
- Modify: `app/(admin)/_layout.tsx`

- [ ] **Step 1: Update admin layout with all screen routes**

Read current `app/(admin)/_layout.tsx` and ensure all admin screens are registered in the Stack. Add screen entries for `tenants`, `advertisers`, `properties`:

```tsx
import { Stack } from 'expo-router';
import { useAuth } from '@/lib/AuthContext';
import { Redirect } from 'expo-router';

export default function AdminLayout() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <Redirect href="/(tabs)/directory" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="tenants" />
      <Stack.Screen name="advertisers" />
      <Stack.Screen name="properties" />
    </Stack>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && ./node_modules/.bin/tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/(admin)/_layout.tsx
git commit -m "feat: register all admin screens in admin stack layout"
```

---

### Task 21: Final Verification

- [ ] **Step 1: Run TypeScript check**

```bash
cd "/Users/davidk/Documents/Dev-Projects/App-Ideas/UNIT PRoject /unit" && ./node_modules/.bin/tsc --noEmit
```
Expected: EXIT_CODE=0

- [ ] **Step 2: Verify file count**

```bash
find app components hooks -name '*.tsx' -o -name '*.ts' | wc -l
```
Expected: ~35+ files

- [ ] **Step 3: Final commit if any loose changes**

```bash
git status
# If untracked/modified files remain:
git add -A
git commit -m "chore: milestone 2 core MVP complete"
```

---

## Summary

| Phase | Tasks | Files Created/Modified |
|-------|-------|----------------------|
| **Pre-req** | 1 | package.json, babel.config.js |
| **Phase 1** | Tasks 1-10 | 19 new component/hook files |
| **Phase 2** | Tasks 11-15 | 8 screen files (4 tab + 4 sub-routes) |
| **Phase 3** | Tasks 16-19 | 4 admin screen files |
| **Phase 4** | Tasks 20-21 | 1 modified layout |
| **Total** | 21 tasks | ~32 files |
