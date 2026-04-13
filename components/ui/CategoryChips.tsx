import { FlatList, Pressable, Text } from 'react-native';
import { BUSINESS_CATEGORIES, getCategoryLabel } from '@/constants/categories';

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

        return (
          <Pressable
            onPress={() => onSelect(isAll ? null : item.key)}
            className={
              isSelected
                ? 'rounded-full px-4 py-2 bg-brand-blue'
                : 'rounded-full px-4 py-2 bg-brand-navy-light border border-brand-blue/40'
            }
          >
            <Text
              className={
                isSelected
                  ? 'text-sm font-nunito-semibold text-white'
                  : 'text-sm font-nunito text-brand-gray'
              }
            >
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}
