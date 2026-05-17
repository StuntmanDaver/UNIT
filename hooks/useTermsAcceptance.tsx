import { useState } from 'react';
import type { ReactElement } from 'react';
import { Text, Linking } from 'react-native';
import Toast from 'react-native-toast-message';
import { Modal } from '@/components/ui/Modal';
import { TERMS_VERSION, policyUrls } from '@/constants/policy';
import { useAuth } from '@/lib/AuthContext';
import { profilesService } from '@/services/profiles';

type UseTermsAcceptanceResult = {
  ensureTermsAccepted: () => Promise<boolean>;
  TermsModal: () => ReactElement | null;
};

export function useTermsAcceptance(): UseTermsAcceptanceResult {
  const { profile, refreshProfile } = useAuth();
  const [visible, setVisible] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const accepted = profile?.accepted_terms_version === TERMS_VERSION && !!profile.accepted_terms_at;

  async function ensureTermsAccepted(): Promise<boolean> {
    if (accepted) return true;
    setVisible(true);
    return false;
  }

  async function acceptTerms(): Promise<void> {
    if (!profile || accepting) return;
    setAccepting(true);
    try {
      await profilesService.update(profile.id, {
        accepted_terms_version: TERMS_VERSION,
        accepted_terms_at: new Date().toISOString(),
      });
      await refreshProfile();
      setVisible(false);
      Toast.show({ type: 'success', text1: 'Terms accepted' });
    } catch {
      Toast.show({ type: 'error', text1: 'Could not save acceptance' });
    } finally {
      setAccepting(false);
    }
  }

  function TermsModal(): ReactElement | null {
    return (
      <Modal
        visible={visible}
        onClose={() => {
          if (!accepting) setVisible(false);
        }}
        title="UNIT Terms"
        actions={[
          { label: accepting ? 'Saving...' : 'I Agree', onPress: acceptTerms, variant: 'primary', testID: 'terms-accept' },
          { label: 'Not Now', onPress: () => setVisible(false), variant: 'ghost', testID: 'terms-cancel' },
        ]}
      >
        <Text className="text-base font-nunito text-brand-ink leading-relaxed mb-3">
          Before posting or uploading content, you agree to keep UNIT useful for your property community: no spam, harassment, illegal content, impersonation, misleading claims, or content you do not have rights to share.
        </Text>
        <Text className="text-base font-nunito text-brand-ink leading-relaxed mb-3">
          Reported content can be reviewed by property admins and may be removed or restricted.
        </Text>
        <Text
          className="text-base font-nunito-semibold text-brand-blue leading-relaxed mb-2"
          onPress={() => Linking.openURL(policyUrls.terms)}
        >
          Open Terms of Use
        </Text>
        <Text
          className="text-base font-nunito-semibold text-brand-blue leading-relaxed"
          onPress={() => Linking.openURL(policyUrls.privacy)}
        >
          Open Privacy Policy
        </Text>
      </Modal>
    );
  }

  return { ensureTermsAccepted, TermsModal };
}
