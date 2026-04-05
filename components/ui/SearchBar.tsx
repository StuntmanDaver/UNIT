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
    <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2.5 gap-2">
      <Search size={18} color={BRAND.steel} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={BRAND.steel}
        className="flex-1 text-base"
        style={{ color: BRAND.navy }}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={16} color={BRAND.steel} />
        </Pressable>
      )}
    </View>
  );
}
