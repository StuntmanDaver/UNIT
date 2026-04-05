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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all(propertyIds.map((id) => propertiesService.getById(id)))
      .then((results) => {
        if (!cancelled) {
          setProperties(results);
          // Auto-select first if nothing selected
          if (!selected && results.length > 0) {
            onSelect(results[0].id);
          }
        }
      })
      .catch(() => {
        // silently handle fetch errors
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [propertyIds, selected, onSelect]);

  if (loading) {
    return (
      <View className="flex-row items-center gap-2 px-1">
        <ActivityIndicator size="small" color={BRAND.steel} />
        <Text className="text-sm text-brand-steel">Loading properties...</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  // Single property — no need for a dropdown
  if (properties.length === 1) {
    return (
      <Text className="text-base font-semibold text-brand-navy">{properties[0].name}</Text>
    );
  }

  const selectedProperty = properties.find((p) => p.id === selected);

  return (
    <View className="relative z-10">
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        className="flex-row items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-3 py-2"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text className="text-sm font-semibold text-brand-navy flex-1" numberOfLines={1}>
          {selectedProperty?.name ?? 'Select property'}
        </Text>
        <ChevronDown size={16} color={BRAND.steel} />
      </Pressable>

      {open && (
        <View className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden">
          {properties.map((property) => {
            const isSelected = property.id === selected;
            return (
              <Pressable
                key={property.id}
                onPress={() => {
                  onSelect(property.id);
                  setOpen(false);
                }}
                className="flex-row items-center px-3 py-2.5 border-b border-gray-50"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#F9FAFB' : isSelected ? '#F0F4FF' : '#FFFFFF',
                })}
              >
                <Text
                  className="flex-1 text-sm"
                  style={{
                    color: isSelected ? BRAND.navy : '#374151',
                    fontWeight: isSelected ? '600' : '400',
                  }}
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
