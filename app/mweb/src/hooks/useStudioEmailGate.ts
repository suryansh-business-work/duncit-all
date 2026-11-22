import { useNavigate } from 'react-router';
import { useConfirm } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { STUDIO_EMAIL_GATE_KEYS, studioNeedsVerifiedEmail, type StudioMode } from '@duncit/utils';
import { useTranslation } from '../i18n/useTranslation';
import { useUserInfo } from '../user-info/useUserInfo';

/** The profile, scrolled to its email verification card (the header nudge
 * opens the same place). */
export const VERIFY_EMAIL_PATH = '/profile?verifyEmail=1';

/**
 * Keeps the Host, Venue and Club Admin studios shut until the account's email
 * is verified (@duncit/utils `studioNeedsVerifiedEmail`). `guard` opens a
 * studio when it may be opened; otherwise it explains why not in a dialog and
 * offers the way to verify. The role switcher, already a dialog, says it in
 * place with `blocks` + `verifyEmail`. Native twin: hooks/useStudioEmailGate.
 */
export function useStudioEmailGate() {
  const { me } = useUserInfo();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEmailVerified = me?.is_email_verified;

  const blocks = (mode: StudioMode) => studioNeedsVerifiedEmail(mode, isEmailVerified);
  const verifyEmail = () => navigate(VERIFY_EMAIL_PATH);

  const explain = async () => {
    const verify = await confirm({
      title: t(STUDIO_EMAIL_GATE_KEYS.title),
      message: t(STUDIO_EMAIL_GATE_KEYS.body),
      confirmLabel: t(STUDIO_EMAIL_GATE_KEYS.action),
      cancelLabel: t(STUDIO_EMAIL_GATE_KEYS.dismiss),
    });
    if (verify) verifyEmail();
  };

  /** Runs `open` unless `mode` is shut, in which case shows the message. */
  const guard = (mode: StudioMode, open: () => void) => {
    if (blocks(mode)) {
      fireAndForget(explain(), logs.mWeb, 'studio', 'useStudioEmailGate');
      return;
    }
    open();
  };

  return { blocks, guard, verifyEmail };
}
