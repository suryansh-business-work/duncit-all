import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** The address Google verified — named so the invite is about THEIR account
   * rather than about accounts in general. */
  email: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * "Google knows you, Duncit does not — shall we make you an account?"
 *
 * Shown when `loginWithGoogle` answers GOOGLE_ACCOUNT_NOT_FOUND. It replaced a
 * notice that said the same thing as a refusal and then dropped the person on
 * the signup screen with nothing carried over, so the only way forward was to
 * press the same Google button a second time. Accepting here carries the
 * credential Google already returned straight into signup.
 *
 * The detail line is the promise the copy has to keep: a Google credential
 * carries no number and no birthday, so signup still has two questions and a
 * code to ask — and nothing exists until they are answered. Saying that here is
 * what stops "we will make your account" reading as though it already happened.
 *
 * Dismissable, unlike the link-consent dialog beside it: nothing is pending on
 * this answer, so backdrop and Escape are just "not now". Native twin:
 * app/mobile-app/src/components/GoogleSignupInviteModal.tsx.
 */
export default function GoogleSignupInviteDialog({
  open,
  email,
  onAccept,
  onDismiss,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onClose={onDismiss} fullWidth maxWidth="xs">
      <DialogTitle>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <PersonAddAlt1Icon fontSize="small" />
          <span>{t('mweb.login.googleNotFoundTitle')}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5}>
          <Typography variant="body2">
            {t('mweb.login.googleNotFoundBody', { vars: { email } })}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('mweb.login.googleNotFoundDetail')}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onDismiss}>{t('mweb.login.googleNotFoundDismiss')}</DuncitButton>
        <DuncitButton variant="contained" onClick={onAccept}>
          {t('mweb.login.googleNotFoundAction')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
