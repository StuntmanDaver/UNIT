import { View, Pressable, Text } from 'react-native';

type SegmentedControlProps = {
  segments: string[];
  selected: string;
  onChange: (segment: string) => void;
  testIDPrefix?: string;
};

function segmentTestId(prefix: string, segment: string): string {
  const slug = segment
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${prefix}-${slug}`;
}

export function SegmentedControl({ segments, selected, onChange, testIDPrefix }: SegmentedControlProps) {
  return (
    <View className="flex-row bg-brand-mist rounded-xl p-1">
      {segments.map((segment) => {
        const isSelected = segment === selected;
        return (
          <Pressable
            key={segment}
            testID={testIDPrefix ? segmentTestId(testIDPrefix, segment) : undefined}
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
                  : 'text-brand-ink font-nunito text-sm'
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
