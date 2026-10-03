import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Skeleton, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import { ENABLE_TWO_FACTOR, START_TWO_FACTOR_SETUP, type TwoFactorSetup } from '../../queries';
import { RecoveryCodesList } from './RecoveryCodesList';
import { TwoFactorScanStep } from './TwoFactorScanStep';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called once the app is on — the tab reloads its security facts. */
  onEnabled: () => void;
}

/**
 * Turn the authenticator app on: a fresh secret → scan it → prove it with a
 * code → the recovery codes, once. The server's `startTwoFactorSetup` /
 * `enableTwoFactor`; nothing about signing in changes until the code is right.
 */
export function TwoFactorSetupDialog({ open, onClose, onEnabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [startSetup, { loading: starting }] = useMutation(START_TWO_FACTOR_SETUP);
  const [enable, { loading: enabling }] = useMutation(ENABLE_TWO_FACTOR);

  const begin = useCallback(() => {
    setLoadError(null);
    startSetup()
      .then((res) => setSetup(res.data?.startTwoFactorSetup ?? null))
      .catch((e) => setLoadError(parseApiError(e, t('shell.profile.genericError'))));
  }, [startSetup, t]);

  /*
    A fresh secret once per OPENING — an old one may have been seen. The ref,
    not the dependency list, is what makes it once: `t` changes identity when
    the catalogue arrives, and a second secret mid-scan would make the code the
    person is typing wrong.
  */
  const requested = useRef(false);
  useEffect(() => {
    if (!open) {
      requested.current = false;
      return;
    }
    if (requested.current) return;
    requested.current = true;
    begin();
  }, [open, begin]);

  const close = () => {
    setSetup(null);
    setCodes(null);
    setLoadError(null);
    onClose();
  };

  const handleEnable = async (code: string) => {
    try {
      const res = await enable({ variables: { code } });
      setCodes([...(res.data?.enableTwoFactor.recovery_codes ?? [])]);
      onEnabled();
    } catch (e) {
      throw new Error(parseApiError(e, t('shell.profile.genericError')));
    }
  };

  const showingCodes = codes !== null;
  return (
    <Dialog
      data-testid="two-factor-setup-dialog"
      open={open}
      // Once the codes are on screen only the button closes it — a stray click
      // outside must not throw away the one copy of them.
      onClose={showingCodes ? undefined : close}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>
        {showingCodes ? t('shell.twoFactor.recoveryTitle') : t('shell.twoFactor.setupTitle')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {loadError && (
            <Alert
              severity="error"
              data-testid="two-factor-setup-error"
              action={
                <DuncitButton color="inherit" size="small" onClick={begin}>
                  {t('shell.common.retry')}
                </DuncitButton>
              }
            >
              {loadError}
            </Alert>
          )}
          {!setup && starting && <Skeleton variant="rounded" height={320} />}
          {setup && !showingCodes && (
            <TwoFactorScanStep setup={setup} enabling={enabling} onEnable={handleEnable} />
          )}
          {showingCodes && <RecoveryCodesList codes={codes} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton
          variant={showingCodes ? 'contained' : 'text'}
          onClick={close}
          data-testid="two-factor-setup-close"
        >
          {showingCodes ? t('shell.twoFactor.savedCodes') : t('shell.common.cancel')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
