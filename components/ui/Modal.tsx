import { View, Text, Pressable, ScrollView } from 'react-native';
import { X } from 'lucide-react-native';
import { BRAND } from '@/constants/colors';
import { Button } from './Button';

type ModalAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  testID?: string;
};

type ModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: ModalAction[];
};

function actionTestID(action: ModalAction): string {
  if (action.testID) return action.testID;
  return `modal-action-${action.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

export function Modal({ visible, onClose, title, children, actions }: ModalProps) {
  if (!visible) return null;

  return (
    <View testID="modal-overlay" className="absolute inset-0 z-50">
      <Pressable
        accessible={false}
        className="flex-1 bg-black/50 items-center justify-center px-4"
        onPress={onClose}
      >
        <Pressable
          accessible={false}
          className="bg-brand-navy-light rounded-2xl w-full max-w-lg overflow-hidden"
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3">
            <Text testID="modal-title" className="text-2xl font-lora-semibold text-brand-gray flex-1 mr-3 leading-tight">{title}</Text>
            <Pressable testID="modal-close" onPress={onClose} hitSlop={8}>
              <X size={20} color={BRAND.steel} />
            </Pressable>
          </View>

          {/* Body */}
          <ScrollView
            className="px-5"
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
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
                  testID={actionTestID(action)}
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
    </View>
  );
}
