import { View, Text, Modal as RNModal, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { Button } from './Button';

type ModalAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
};

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: ModalAction[];
};

export function Modal({ visible, onClose, title, children, actions }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center px-4"
        onPress={onClose}
      >
        <Pressable
          className="bg-white rounded-2xl w-full max-w-lg overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text className="text-lg font-bold text-brand-navy flex-1 mr-3">{title}</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={20} color={BRAND.steel} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {/* Actions */}
          {actions && actions.length > 0 && (
            <View className="px-5 pb-5 pt-3 gap-2">
              {actions.map((action, index) => (
                <Button
                  key={index}
                  onPress={action.onPress}
                  variant={action.variant ?? 'primary'}
                >
                  {action.label}
                </Button>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
