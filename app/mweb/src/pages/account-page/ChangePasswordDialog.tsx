import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import {
  CurrentPasswordForm,
  NewPasswordForm,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from '../../forms/change-password';
import { parseApiError } from '../../utils/parseApiError';
import { CHANGE_PASSWORD_WITH_OTP, REQUEST_PASSWORD_CHANGE_OTP } from './security-queries';

interface Props {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/** Two-step change-password dialog: verify current password → OTP + new password. */
export default function ChangePasswordDialog({ open, onClose, onChanged }: Readonly<Props>) {
  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [requestOtp, { loading: requesting }] = useMutation(REQUEST_PASSWORD_CHANGE_OTP);
  const [changePassword, { loading: changing }] = useMutation(CHANGE_PASSWORD_WITH_OTP);

  const close = () => {
    setStep(1);
    setCurrentPassword('');
    setInfo(null);
    onClose();
  };

  const sendOtp = async (password: string) => {
    await requestOtp({ variables: { input: { current_password: password } } });
    setCurrentPassword(password);
    setStep(2);
    setInfo('OTP sent to your email.');
  };

  const handleRequest = async (values: CurrentPasswordValues) => {
    try {
      await sendOtp(values.current_password);
    } catch (e) {
      throw new Error(parseApiError(e));
    }
  };

  const handleResend = () => {
    sendOtp(currentPassword).catch((e) => setInfo(parseApiError(e)));
  };

  const handleChange = async (values: NewPasswordValues) => {
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

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>Change password</DialogTitle>
      <DialogContent dividers>
        {step === 1 ? (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Enter your current password and we’ll email you a one-time code.
            </Typography>
            <CurrentPasswordForm loading={requesting} onSubmit={handleRequest} />
          </Stack>
        ) : (
          <Stack spacing={1.5}>
            {info && <Alert severity="success">{info}</Alert>}
            <NewPasswordForm loading={changing} onSubmit={handleChange} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Didn’t get it?{' '}
              <Link
                component="button"
                type="button"
                onClick={handleResend}
                disabled={requesting}
                underline="hover"
              >
                {requesting ? 'Resending…' : 'Resend OTP'}
              </Link>
            </Typography>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
