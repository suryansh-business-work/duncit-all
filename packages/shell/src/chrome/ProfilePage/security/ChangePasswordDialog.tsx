import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { Alert, Dialog, DialogContent, DialogTitle, Link, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '../../../i18n/useTranslation';
import { CHANGE_PASSWORD_WITH_OTP, REQUEST_PASSWORD_CHANGE_OTP } from '../queries';
import {
  CurrentPasswordForm,
  NewPasswordForm,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from './change-password';

interface Props {
  open: boolean;
  /** False for an account created through Google — it has none to prove. */
  hasPassword: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * Change (or, with none yet, create) the password: prove the current one →
 * an OTP is emailed → OTP + new password. The server's
 * `requestPasswordChangeOtp` / `changePasswordWithOtp`, the same two steps mWeb
 * and the app take.
 */
export function ChangePasswordDialog({ open, hasPassword, onClose, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [requestOtp, { loading: requesting }] = useMutation(REQUEST_PASSWORD_CHANGE_OTP);
  const [changePassword, { loading: changing }] = useMutation(CHANGE_PASSWORD_WITH_OTP);

  const close = () => {
    setStep(1);
    setCurrentPassword('');
    setNotice(null);
    onClose();
  };

  // An empty password is the create path: the server reads "none sent" as an
  // account that has no password, never as a wrong one.
  const sendOtp = async (password: string) => {
    await requestOtp({ variables: { input: password ? { current_password: password } : {} } });
    setCurrentPassword(password);
    setStep(2);
    setNotice({ ok: true, text: t('shell.profile.security.codeSent') });
  };

  const handleRequest = async (values: CurrentPasswordValues) => {
    try {
      await sendOtp(values.current_password);
    } catch (e) {
      throw new Error(parseApiError(e, t('shell.profile.genericError')));
    }
  };

  const handleCreateCode = () => {
    setNotice(null);
    sendOtp('').catch((e) => setNotice({ ok: false, text: parseApiError(e, t('shell.profile.genericError')) }));
  };

  const handleResend = () => {
    sendOtp(currentPassword).catch((e) =>
      setNotice({ ok: false, text: parseApiError(e, t('shell.profile.genericError')) }),
    );
  };

  const handleChange = async (values: NewPasswordValues) => {
    if (values.new_password === currentPassword) {
      throw new Error(t('shell.profile.security.mustDiffer'));
    }
    try {
      await changePassword({ variables: { input: { otp: values.otp, new_password: values.new_password } } });
    } catch (e) {
      throw new Error(parseApiError(e, t('shell.profile.genericError')));
    }
    onChanged();
    close();
  };

  return (
    <Dialog data-testid="change-password-dialog" open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>
        {hasPassword ? t('shell.profile.security.changePassword') : t('shell.profile.security.createPassword')}
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {notice && (
            <Alert data-testid="change-password-notice" severity={notice.ok ? 'success' : 'error'}>
              {notice.text}
            </Alert>
          )}
          {step === 1 && hasPassword && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('shell.profile.security.currentStepHint')}
              </Typography>
              <CurrentPasswordForm loading={requesting} onSubmit={handleRequest} />
            </>
          )}
          {step === 1 && !hasPassword && (
            <>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {t('shell.profile.security.createStepHint')}
              </Typography>
              <DuncitButton
                variant="contained"
                disabled={requesting}
                onClick={handleCreateCode}
                data-testid="change-password-send-code"
              >
                {requesting ? t('shell.profile.security.sendingCode') : t('shell.profile.security.sendCode')}
              </DuncitButton>
            </>
          )}
          {step === 2 && (
            <>
              <NewPasswordForm loading={changing} onSubmit={handleChange} />
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                {t('shell.profile.security.noCode')}{' '}
                <Link
                  data-testid="change-password-resend"
                  component="button"
                  type="button"
                  onClick={handleResend}
                  disabled={requesting}
                  underline="hover"
                >
                  {t('shell.profile.security.resendCode')}
                </Link>
              </Typography>
            </>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
