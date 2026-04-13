import { View, Pressable, Text } from 'react-native';

type SegmentedControlProps = {
  segments: string[];
  selected: string;
  onChange: (segment: string) => void;
};

export function SegmentedControl({ segments, selected, onChange }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-brand-navy-light rounded-xl p-1">
      {segments.map((segment) => {
        const isSelected = segment === selected;
        return (
          <Pressable
            key={segment}
            onPress={() => onChange(segment)}
            className={
              isSelected
                ? 'flex-1 bg-brand-blue rounded-lg px-4 py-2 items-center'
                : 'flex-1 bg-transparent rounded-lg px-4 py-2 items-center'
            }
          >
            <Text
              className={
                isSelected
                  ? 'text-white font-nunito-semibold text-sm'
                  : 'text-brand-steel font-nunito text-sm'
              }
            >
              {segment}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
