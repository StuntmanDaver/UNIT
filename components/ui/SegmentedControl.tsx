import { View, Pressable, Text } from 'react-native';

type SegmentedControlProps = {
  segments: string[];
  selected: string;
  onChange: (segment: string) => void;
};

export function SegmentedControl({ segments, selected, onChange }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-gray-100 rounded-lg p-1">
      {segments.map((segment) => {
        const isSelected = segment === selected;
        return (
          <Pressable
            key={segment}
            onPress={() => onChange(segment)}
            className="flex-1 items-center justify-center rounded-md py-1.5"
            style={{ backgroundColor: isSelected ? '#101B29' : 'transparent' }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: isSelected ? '#FFFFFF' : '#6B7280' }}
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
