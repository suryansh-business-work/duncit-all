import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { STUDIO_EMAIL_GATE_KEYS, studioNeedsVerifiedEmail } from '@duncit/utils';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useMe } from '@/hooks/useMe';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import type { StudioMode } from '@/utils/studio-mode';

/**
 * Keeps the Host, Venue and Club Admin studios shut until the account's email
 * is verified (@duncit/utils `studioNeedsVerifiedEmail`). `guard` opens a
 * studio when it may be opened; otherwise it shows `dialog`, which explains
 * why and offers the way to verify, so the caller must render `dialog`. The
 * role switcher, already a modal, says it in place with `blocks` +
 * `verifyEmail`. mWeb twin: hooks/useStudioEmailGate.
 */
export function useStudioEmailGate() {
  const { data } = useMe();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { t } = useTranslation();
  const [explaining, setExplaining] = useState(false);
  const isEmailVerified = data?.me?.is_email_verified;

  const blocks = (mode: StudioMode) => studioNeedsVerifiedEmail(mode, isEmailVerified);
  // The profile, scrolled to its email verification card — the home banner's
  // destination too.
  const verifyEmail = () => navigation.navigate('Profile', { verifyEmail: true });

  /** Runs `open` unless `mode` is shut, in which case shows the message. */
  const guard = (mode: StudioMode, open: () => void) => {
    if (blocks(mode)) {
      setExplaining(true);
      return;
    }
    open();
  };

  const dialog = (
    <ConfirmDialog
      open={explaining}
      testID="studio-email-gate-dialog"
      title={t(STUDIO_EMAIL_GATE_KEYS.title)}
      message={t(STUDIO_EMAIL_GATE_KEYS.body)}
      confirmLabel={t(STUDIO_EMAIL_GATE_KEYS.action)}
      cancelLabel={t(STUDIO_EMAIL_GATE_KEYS.dismiss)}
      onCancel={() => setExplaining(false)}
      onConfirm={() => {
        setExplaining(false);
        verifyEmail();
      }}
    />
  );

  return { isEmailVerified, blocks, guard, verifyEmail, dialog };
}
