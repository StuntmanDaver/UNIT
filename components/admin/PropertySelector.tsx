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

    propertiesService.getByIds(propertyIds)
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
  }, [propertyIds, onSelect]); // `selected` removed — re-fetching on every selection is unnecessary

  if (loading) {
    return (
      <View className="flex-row items-center gap-2 px-1">
        <ActivityIndicator size="small" color={BRAND.steel} />
        <Text className="text-sm font-nunito text-brand-steel">Loading properties...</Text>
      </View>
    );
  }

  if (properties.length === 0) {
    return null;
  }

  // Single property — no need for a dropdown
  if (properties.length === 1) {
    return (
      <View className="flex-row items-center gap-2 bg-brand-navy-light border border-brand-blue/40 rounded-xl px-4 py-3">
        <Text className="text-sm font-nunito-semibold text-brand-gray flex-1" numberOfLines={1}>
          {properties[0].name}
        </Text>
      </View>
    );
  }

  const selectedProperty = properties.find((p) => p.id === selected);

  return (
    <View className="relative z-10">
      <Pressable
        onPress={() => setOpen((prev) => !prev)}
        className="flex-row items-center gap-2 bg-brand-navy-light border border-brand-blue/40 rounded-xl px-4 py-3"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text className="text-sm font-nunito-semibold text-brand-gray flex-1" numberOfLines={1}>
          {selectedProperty?.name ?? 'Select property'}
        </Text>
        <ChevronDown size={16} color={BRAND.steel} />
      </Pressable>

      {open && (
        <View className="absolute top-full mt-1 left-0 right-0 bg-brand-navy-light border border-brand-blue/40 rounded-xl shadow-md overflow-hidden">
          {properties.map((property) => {
            const isSelected = property.id === selected;
            return (
              <Pressable
                key={property.id}
                onPress={() => {
                  onSelect(property.id);
                  setOpen(false);
                }}
                className="flex-row items-center px-4 py-3 border-b border-brand-blue/40"
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#101B29' : isSelected ? '#101B29' : '#1D263A',
                })}
              >
                <Text
                  className={`flex-1 text-sm text-brand-gray ${isSelected ? 'font-nunito-semibold' : 'font-nunito'}`}
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
