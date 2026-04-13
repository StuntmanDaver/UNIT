import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Building2 } from 'lucide-react-native';
import { GradientHeader } from '@/components/ui/GradientHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { BusinessCard } from '@/components/tenant/BusinessCard';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useDebounce } from '@/hooks/useDebounce';
import { useAuth } from '@/lib/AuthContext';
import type { Business } from '@/services/businesses';

export default function DirectoryScreen() {
  const { propertyIds } = useAuth();
  const propertyId = propertyIds[0] ?? '';

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: businesses, isLoading, refetch, isRefetching } = useBusinesses(
    propertyId,
    debouncedSearch || undefined,
    category ?? undefined
  );

  const handlePress = useCallback((id: string) => {
    router.push(`/directory/${id}`);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Business }) => (
      <View className="px-4 mb-3">
        <BusinessCard
          business={item}
          compact
          onPress={() => handlePress(item.id)}
        />
      </View>
    ),
    [handlePress]
  );

  const keyExtractor = useCallback((item: Business) => item.id, []);

  if (isLoading && !businesses) {
    return <LoadingScreen message="Loading directory..." />;
  }

  return (
    <View className="flex-1 bg-brand-navy">
      <GradientHeader>
        <Text className="text-3xl font-lora-semibold text-white leading-tight mb-3">Directory</Text>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search businesses..."
        />
      </GradientHeader>

      <View className="py-3">
        <CategoryChips selected={category} onSelect={setCategory} />
      </View>

      <FlatList
        data={businesses ?? []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={Building2}
            title="No businesses found"
            message={
              search
                ? 'Try adjusting your search or category filter.'
                : 'No businesses have been added to this property yet.'
            }
          />
        }
      />
    </View>
  );
}
