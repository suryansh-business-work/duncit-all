import { useMutation } from '@apollo/client/react';
import { Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import { TwoFactorCodeForm } from '../../../../two-factor/two-factor-code';
import { DISABLE_TWO_FACTOR } from '../../queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

/**
 * Turn the authenticator app off. It takes a current code (or a recovery code,
 * for a lost phone) — a session left open on somebody else's screen must not
 * be enough to remove the second step.
 */
export function TwoFactorDisableDialog({ open, onClose, onDisabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [disable, { loading }] = useMutation(DISABLE_TWO_FACTOR);

  const handleDisable = async (code: string) => {
    try {
      await disable({ variables: { code } });
    } catch (e) {
      throw new Error(parseApiError(e, t('shell.profile.genericError')));
    }
    onDisabled();
    onClose();
  };

  return (
    <Dialog data-testid="two-factor-disable-dialog" open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{t('shell.twoFactor.disableTitle')}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('shell.twoFactor.disableHint')}
          </Typography>
          <TwoFactorCodeForm
            allowRecovery
            loading={loading}
            submitLabel={t('shell.twoFactor.turnOff')}
            testId="two-factor-disable"
            onSubmit={handleDisable}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose} data-testid="two-factor-disable-cancel">
          {t('shell.common.cancel')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
