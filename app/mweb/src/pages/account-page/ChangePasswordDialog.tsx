import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import {
  CurrentPasswordForm,
  NewPasswordForm,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from '../../forms/change-password';
import { parseApiError } from '../../utils/parseApiError';
import { CHANGE_PASSWORD_WITH_OTP, REQUEST_PASSWORD_CHANGE_OTP } from './security-queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  open: boolean;
  /** Whether the account already HAS a password — see the section's note. */
  hasPassword: boolean;
  onClose: () => void;
  onChanged: () => void;
}

interface RequestStepProps {
  hasPassword: boolean;
  loading: boolean;
  errorMessage: string | null;
  onSubmit: (values: CurrentPasswordValues) => Promise<void>;
  onSendCode: () => void;
}

/**
 * Step one, in the two shapes it takes.
 *
 * An account with a password proves it here. A Google-signup account has none
 * to prove, so the only thing left to ask for is the code itself.
 */
function RequestStep({
  hasPassword,
  loading,
  errorMessage,
  onSubmit,
  onSendCode,
}: Readonly<RequestStepProps>) {
  const { t } = useTranslation();

  if (hasPassword) {
    return (
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('mweb.changePassword.currentPasswordStepHint')}
        </Typography>
        <CurrentPasswordForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('mweb.changePassword.createStepHint')}
      </Typography>
      <DuncitButton
        variant="contained"
        size="large"
        disabled={loading}
        onClick={onSendCode}
        data-testid="change-password-send-code"
        sx={{ borderRadius: '16px', py: 1.1, fontWeight: 700, textTransform: 'none' }}
      >
        {t('mweb.account.sendCode')}
      </DuncitButton>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
    </Stack>
  );
}

/** Two-step password dialog: prove the current password (or, with none, just
 * ask for the code) → OTP + new password. Native twin. */
export default function ChangePasswordDialog({
  open,
  hasPassword,
  onClose,
  onChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestOtp, { loading: requesting }] = useMutation<any>(REQUEST_PASSWORD_CHANGE_OTP);
  const [changePassword, { loading: changing }] = useMutation<any>(CHANGE_PASSWORD_WITH_OTP);

  const close = () => {
    setStep(1);
    setCurrentPassword('');
    setInfo(null);
    setError(null);
    onClose();
  };

  // An empty password means there is none to send: the server reads that as the
  // create path rather than a wrong current password.
  const sendOtp = async (password: string) => {
    const input = password ? { current_password: password } : {};
    await requestOtp({ variables: { input } });
    setCurrentPassword(password);
    setStep(2);
    setInfo(t('mweb.changePassword.otpSentToYourEmail'));
  };

  const handleRequest = async (values: CurrentPasswordValues) => {
    try {
      await sendOtp(values.current_password);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  const handleSendCode = () => {
    setError(null);
    sendOtp('').catch((e) => setError(parseApiError(e)));
  };

  const handleResend = () => {
    sendOtp(currentPassword).catch((e) => setInfo(parseApiError(e)));
  };

  const handleChange = async (values: NewPasswordValues) => {
    if (values.new_password === currentPassword) {
      throw new Error(t('mweb.changePassword.mustDifferFromCurrent'));
    }
    try {
      await changePassword({
        variables: { input: { otp: values.otp, new_password: values.new_password } },
      });
      onChanged();
      close();
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  const title = hasPassword
    ? t('mweb.account.changePassword')
    : t('mweb.account.createPassword');

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {step === 1 ? (
          <RequestStep
            hasPassword={hasPassword}
            loading={requesting}
            errorMessage={error}
            onSubmit={handleRequest}
            onSendCode={handleSendCode}
          />
        ) : (
          <Stack spacing={1.5}>
            {info && <Alert severity="success">{info}</Alert>}
            <NewPasswordForm loading={changing} onSubmit={handleChange} />
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              {t('mweb.account.didntGetIt')}{' '}
              <Link
                component="button"
                type="button"
                onClick={handleResend}
                disabled={requesting}
                underline="hover"
              >
                {t('mweb.account.resendOtp')}
              </Link>
            </Typography>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
