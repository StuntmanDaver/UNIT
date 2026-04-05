import { FlatList, Pressable, Text, View } from 'react-native';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';
import { CATEGORY_COLORS } from '@/constants/colors';

type CategoryChipsProps = {
  selected: string | null;
  onSelect: (category: string | null) => void;
};

type ChipItem = { key: string; label: string };

const ALL_CHIP: ChipItem = { key: '__all__', label: 'All' };

const CHIPS: ChipItem[] = [
  ALL_CHIP,
  ...BUSINESS_CATEGORIES.map((cat) => ({ key: cat, label: getCategoryLabel(cat) })),
];

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  return (
    <FlatList
      data={CHIPS}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.key}
      contentContainerClassName="px-4 gap-2"
      renderItem={({ item }) => {
        const isAll = item.key === '__all__';
        const isSelected = isAll ? selected === null : selected === item.key;
        const accentColor = isAll ? '#101B29' : (CATEGORY_COLORS[item.key] ?? '#6B7280');

        return (
          <Pressable
            onPress={() => onSelect(isAll ? null : item.key)}
            className="rounded-full px-3 py-1.5 border"
            style={{
              backgroundColor: isSelected ? accentColor : '#FFFFFF',
              borderColor: isSelected ? accentColor : '#D1D5DB',
            }}
          >
            <Text
              className="text-sm font-medium"
              style={{ color: isSelected ? '#FFFFFF' : '#374151' }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
