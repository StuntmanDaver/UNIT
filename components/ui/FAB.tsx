import { Pressable } from 'react-native';
import { Plus, LucideIcon } from 'lucide-react-native';

type FABProps = {
  onPress: () => void;
  icon?: LucideIcon;
};

export function FAB({ onPress, icon: Icon = Plus }: FABProps) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute bottom-6 right-6 w-14 h-14 bg-brand-navy rounded-full items-center justify-center shadow-lg"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <Icon size={24} color="#FFFFFF" />
    </Pressable>
  );
}
