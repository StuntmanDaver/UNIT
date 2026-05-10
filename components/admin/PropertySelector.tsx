import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { ChevronDown, Check } from 'lucide-react-native';
import { propertiesService, Property } from '@/services/properties';
import { BRAND } from '@/constants/colors';

type PropertySelectorProps = {
  propertyIds: string[];
  selected: string | null;
  onSelect: (propertyId: string) => void;
};

export function PropertySelector({ propertyIds, selected, onSelect }: PropertySelectorProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchProperties = () => {
    setLoading(true);
    setLoadError(null);

    propertiesService.getByIds(propertyIds)
      .then((results) => {
        setProperties(results);
        if (!selected && results.length > 0) {
          onSelect(results[0].id);
        }
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : 'Failed to load properties');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    propertiesService.getByIds(propertyIds)
      .then((results) => {
        if (!cancelled) {
          setProperties(results);
          if (!selected && results.length > 0) {
            onSelect(results[0].id);
          }
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load properties');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyIds, onSelect]);

  if (loading) {
    return (
      <View className="flex-row items-center gap-2 px-1">
        <ActivityIndicator size="small" color={BRAND.steel} />
        <Text className="text-sm font-nunito text-brand-ink-muted">Loading properties...</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <Pressable
        onPress={fetchProperties}
        className="flex-row items-center gap-2 bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3"
      >
        <Text className="text-sm font-nunito text-red-700 flex-1" numberOfLines={2}>
          {loadError} — tap to retry
        </Text>
      </Pressable>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  // Single property — no need for a dropdown
  if (properties.length === 1) {
    return (
      <View
        testID="property-selector"
        className="flex-row items-center gap-2 bg-brand-mist border border-brand-blue/40 rounded-xl px-4 py-3"
      >
        <Text className="text-sm font-nunito-semibold text-brand-ink flex-1" numberOfLines={1}>
          {properties[0].name}
        </Text>
      </View>
    );
  }

  const selectedProperty = properties.find((p) => p.id === selected);

  return (
    <View className="relative z-10">
      <Pressable
        testID="property-selector"
        onPress={() => setOpen((prev) => !prev)}
        className="flex-row items-center gap-2 bg-brand-mist border border-brand-blue/40 rounded-xl px-4 py-3"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text className="text-sm font-nunito-semibold text-brand-ink flex-1" numberOfLines={1}>
          {selectedProperty?.name ?? 'Select property'}
        </Text>
        <ChevronDown size={16} color={BRAND.steel} />
      </Pressable>

      {open && (
        <View className="absolute top-full mt-1 left-0 right-0 bg-brand-mist border border-brand-blue/40 rounded-xl shadow-md overflow-hidden">
          {properties.map((property) => {
            const isSelected = property.id === selected;
            return (
              <Pressable
                key={property.id}
                testID="property-selector-option"
                onPress={() => {
                  onSelect(property.id);
                  setOpen(false);
                }}
                className="flex-row items-center px-4 py-3 border-b border-brand-blue/40"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#F4F5F7' : isSelected ? '#EAF0F8' : '#FFFFFF',
                })}
              >
                <Text
                  className={`flex-1 text-sm text-brand-ink ${isSelected ? 'font-nunito-semibold' : 'font-nunito'}`}
                  numberOfLines={1}
                >
                  {property.name}
                </Text>
                {isSelected && <Check size={14} color={BRAND.blue} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
