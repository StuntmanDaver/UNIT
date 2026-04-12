// components/admin/PromotionReviewActions.tsx
import { useState } from 'react';
import { View, Text } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { AdminPromotionReviewAction } from '@/services/promotions';

type Props = {
  onAction: (action: AdminPromotionReviewAction) => Promise<void>;
  loading: boolean;
};

type PendingAction = 'allow_revision' | 'require_repayment' | 'reject';

export function PromotionReviewActions({ onAction, loading }: Props) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');

  const handleNoteConfirm = async () => {
    if (!note.trim()) {
      setNoteError('A note is required');
      return;
    }
    if (!pendingAction) return;
    const action = { action: pendingAction, note: note.trim() } as AdminPromotionReviewAction;
    await onAction(action);
    setPendingAction(null);
    setNote('');
    setNoteError('');
  };

  const handleClose = () => {
    setPendingAction(null);
    setNote('');
    setNoteError('');
  };

  const modalTitle =
    pendingAction === 'allow_revision' ? 'Allow Revision' :
    pendingAction === 'require_repayment' ? 'Require Repayment' :
    'Reject Promotion';

  return (
    <>
      <View className="gap-3">
        <Button
          onPress={() => onAction({ action: 'approve' })}
          disabled={loading}
          className="bg-green-600"
        >
          Approve
        </Button>
        <Button
          onPress={() => setPendingAction('allow_revision')}
          disabled={loading}
          className="bg-amber-500"
        >
          Allow Revision
        </Button>
        <Button
          onPress={() => setPendingAction('require_repayment')}
          disabled={loading}
          className="bg-purple-600"
        >
          Require Repayment
        </Button>
        <Button
          onPress={() => setPendingAction('reject')}
          disabled={loading}
          variant="destructive"
        >
          Reject
        </Button>
      </View>

      <Modal visible={!!pendingAction} onClose={handleClose} title={modalTitle}>
        <Text className="text-sm text-brand-steel mb-3">
          Provide a note for the advertiser explaining what needs to change.
        </Text>
        <Input
          label="Note"
          value={note}
          onChangeText={(t) => { setNote(t); setNoteError(''); }}
          placeholder="e.g. Image dimensions don't meet requirements"
          multiline
          numberOfLines={3}
          error={noteError || undefined}
        />
        <View className="flex-row gap-3 mt-4 mb-2">
          <View className="flex-1">
            <Button onPress={handleClose} variant="secondary">Cancel</Button>
          </View>
          <View className="flex-1">
            <Button
              onPress={handleNoteConfirm}
              disabled={loading}
            >
              Confirm
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}
