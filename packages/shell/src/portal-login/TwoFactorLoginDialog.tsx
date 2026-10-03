import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import { TwoFactorCodeForm } from '../two-factor/two-factor-code';

interface Props {
  open: boolean;
  busy: boolean;
  /** Trade the code for the session; a thrown Error's message is shown. */
  onSubmit: (code: string) => Promise<void>;
  onCancel: () => void;
}

/**
 * The second step of a console sign-in: the 6-digit code from the
 * authenticator app, or a recovery code when the phone is not to hand.
 */
export default function TwoFactorLoginDialog({ open, busy, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Dialog
      data-testid="two-factor-login-dialog"
      open={open}
      onClose={busy ? undefined : onCancel}
      fullWidth
      maxWidth="xs"
      aria-describedby="two-factor-login-hint"
    >
      <DialogTitle>{t('shell.twoFactor.loginTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography id="two-factor-login-hint" variant="body2" sx={{ color: 'text.secondary' }}>
            {t('shell.twoFactor.loginHint')}
          </Typography>
          {/* Keyed on open, so a fresh challenge starts with an empty box and no old error. */}
          {open && (
            <TwoFactorCodeForm
              allowRecovery
              loading={busy}
              submitLabel={t('shell.twoFactor.verify')}
              testId="two-factor-login"
              onSubmit={onSubmit}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel} disabled={busy} data-testid="two-factor-login-cancel">
          {t('shell.common.cancel')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
