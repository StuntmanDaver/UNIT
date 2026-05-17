import { useState } from 'react';
import { Text, TextInput, Pressable, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { Modal } from '@/components/ui/Modal';
import { BRAND } from '@/constants/colors';
import {
  contentModerationService,
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
} from '@/services/contentModeration';

type ReportContentModalProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string;
};

export function ReportContentModal({
  visible,
  onClose,
  propertyId,
  targetType,
  targetId,
  targetLabel,
}: ReportContentModalProps) {
  const [reason, setReason] = useState<ReportReason>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReport(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    try {
      await contentModerationService.createReport({
        property_id: propertyId,
        target_type: targetType,
        target_id: targetId,
        reason,
        details,
      });
      Toast.show({ type: 'success', text1: 'Report sent', text2: 'An admin will review it.' });
      setDetails('');
      setReason('spam');
      onClose();
    } catch {
      Toast.show({ type: 'error', text1: 'Could not send report' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="Report Content"
      actions={[
        { label: submitting ? 'Sending...' : 'Submit Report', onPress: submitReport, variant: 'primary', testID: 'submit-content-report' },
        { label: 'Cancel', onPress: onClose, variant: 'ghost' },
      ]}
    >
      <Text className="text-base font-nunito text-brand-ink leading-relaxed mb-3">
        Report {targetLabel} if it violates UNIT rules or does not belong in this property community.
      </Text>

      <View className="gap-2 mb-4">
        {REPORT_REASONS.map((item) => {
          const selected = item.value === reason;
          return (
            <Pressable
              key={item.value}
              onPress={() => setReason(item.value)}
              className={`rounded-xl border px-4 py-3 ${
                selected ? 'bg-brand-blue border-brand-blue' : 'bg-brand-cloud border-brand-blue/40'
              }`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
            >
              <Text className={`text-base font-nunito-semibold ${selected ? 'text-white' : 'text-brand-ink'}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text className="text-sm font-nunito text-brand-ink mb-2">Details</Text>
      <TextInput
        value={details}
        onChangeText={setDetails}
        placeholder="Optional context for the admin"
        placeholderTextColor={BRAND.steel}
        multiline
        textAlignVertical="top"
        className="min-h-28 border border-brand-blue/40 rounded-xl px-4 py-3 text-base text-brand-ink font-nunito bg-brand-cloud"
      />
    </Modal>
  );
}
