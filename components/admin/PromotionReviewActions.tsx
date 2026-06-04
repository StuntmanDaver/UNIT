// components/admin/PromotionReviewActions.tsx
import { useRef, useState } from 'react';
import { Pressable, View, Text, TextInput } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BRAND } from '@/constants/colors';
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
  const noteRef = useRef('');

  const handleNoteConfirm = async () => {
    const trimmedNote = noteRef.current.trim();
    if (!trimmedNote) {
      setNoteError('A note is required');
      return;
    }
    if (!pendingAction) return;
    const action = { action: pendingAction, note: trimmedNote } as AdminPromotionReviewAction;
    setPendingAction(null);
    setNote('');
    noteRef.current = '';
    setNoteError('');
    await onAction(action);
  };

  const handleClose = () => {
    setPendingAction(null);
    setNote('');
    noteRef.current = '';
    setNoteError('');
  };

  const modalTitle =
    pendingAction === 'allow_revision' ? 'Allow Revision' :
    pendingAction === 'require_repayment' ? 'Require Repayment' :
    'Reject Promotion';
  const suggestedNote =
    pendingAction === 'allow_revision' ? 'Please revise and resubmit this promotion.' :
    pendingAction === 'require_repayment' ? 'Please repay after updating this promotion.' :
    'This promotion does not meet property guidelines.';

  const useSuggestedNote = () => {
    noteRef.current = suggestedNote;
    setNote(suggestedNote);
    setNoteError('');
  };

  const submitSuggestedNote = async () => {
    if (!pendingAction) return;
    noteRef.current = suggestedNote;
    setNote(suggestedNote);
    setNoteError('');
    const action = { action: pendingAction, note: suggestedNote } as AdminPromotionReviewAction;
    setPendingAction(null);
    setNote('');
    noteRef.current = '';
    await onAction(action);
  };

  return (
    <>
      <View className="gap-3">
        <Button
          onPress={() => onAction({ action: 'approve' })}
          disabled={loading}
          variant="primary"
          testID="promotion-review-approve"
        >
          Approve
        </Button>
        <Button
          onPress={() => setPendingAction('allow_revision')}
          disabled={loading}
          variant="secondary"
          testID="promotion-review-allow-revision"
        >
          Allow Revision
        </Button>
        <Button
          onPress={() => setPendingAction('require_repayment')}
          disabled={loading}
          variant="secondary"
          testID="promotion-review-require-repayment"
        >
          Require Repayment
        </Button>
        <Button
          onPress={() => setPendingAction('reject')}
          disabled={loading}
          variant="destructive"
          testID="promotion-review-reject"
        >
          Reject
        </Button>
      </View>

      <Modal
        visible={!!pendingAction}
        onClose={handleClose}
        title={modalTitle}
        closeOnBackdropPress={false}
        actions={[
          {
            label: 'Submit Suggested',
            onPress: submitSuggestedNote,
            testID: 'promotion-review-submit-template',
            disabled: loading,
          },
          {
            label: 'Confirm',
            onPress: handleNoteConfirm,
            testID: 'promotion-review-confirm',
            disabled: loading,
          },
          {
            label: 'Cancel',
            onPress: handleClose,
            variant: 'secondary',
            testID: 'promotion-review-cancel',
            disabled: loading,
          },
        ]}
      >
        <Text className="text-sm font-nunito text-brand-ink mb-4">
          Provide a note for the advertiser explaining what needs to change.
        </Text>
        <Pressable
          testID="promotion-review-note-template"
          onPress={useSuggestedNote}
          className="self-start rounded-full border border-brand-blue/40 bg-brand-blue/10 px-3 py-2 mb-4"
        >
          <Text className="text-sm font-nunito-semibold text-brand-ink">Use suggested note</Text>
        </Pressable>
        <View className="mb-4">
          <Text className="text-sm font-nunito text-brand-ink mb-2">Note</Text>
          <TextInput
            testID="promotion-review-note"
            value={note}
            onChangeText={(t) => { noteRef.current = t; setNote(t); setNoteError(''); }}
            placeholder="e.g. Image dimensions don't meet requirements"
            placeholderTextColor={BRAND.steel}
            returnKeyType="done"
            onSubmitEditing={handleNoteConfirm}
            className={`border rounded-xl px-4 py-3 text-base text-brand-ink font-nunito bg-brand-cloud ${
              noteError ? 'border-red-500' : 'border-brand-blue/40'
            }`}
            style={{ minHeight: 52 }}
          />
          {noteError ? (
            <Text className="text-sm font-nunito text-red-700 mt-1">{noteError}</Text>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
