import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import {
  CurrentPasswordForm,
  NewPasswordForm,
  type CurrentPasswordValues,
  type NewPasswordValues,
} from '@/forms/change-password';
import {
  MobileChangePasswordWithOtpDocument,
  MobileRequestPasswordChangeOtpDocument,
} from '@/graphql/account';
import { graphqlRequest } from '@/services/graphql.client';
import { SecuritySheet } from './SecuritySheet';

export interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

/** Two-step change-password sheet (Tamagui) — RN twin of mWeb's dialog:
 * verify current password → OTP + new password. */
export function ChangePasswordDialog({
  open,
  onClose,
  onChanged,
}: Readonly<ChangePasswordDialogProps>) {
  const [step, setStep] = useState<1 | 2>(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const close = () => {
    setStep(1);
    setCurrentPassword('');
    setInfo(null);
    setError(null);
    setLoading(false);
    onClose();
  };

  const sendOtp = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(
        MobileRequestPasswordChangeOtpDocument,
        { input: { current_password: password } },
        { auth: true },
      );
      setCurrentPassword(password);
      setStep(2);
      setInfo('OTP sent to your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (values: CurrentPasswordValues) => {
    try {
      await sendOtp(values.current_password);
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const handleResend = () => {
    sendOtp(currentPassword).catch((e) => setError(errMsg(e)));
  };

  const handleChange = async (values: NewPasswordValues) => {
    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(
        MobileChangePasswordWithOtpDocument,
        { input: { otp: values.otp, new_password: values.new_password } },
        { auth: true },
      );
      onChanged();
      close();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecuritySheet
      open={open}
      title="Change password"
      testID="change-password-dialog"
      onClose={close}
    >
      {step === 1 ? (
        <YStack gap={12}>
          <Text fontSize={13.5} color="$muted">
            Enter your current password and we’ll email you a one-time code.
          </Text>
          <CurrentPasswordForm loading={loading} errorMessage={error} onSubmit={handleRequest} />
        </YStack>
      ) : (
        <YStack gap={12}>
          <Text fontSize={13.5} color="$primary" testID="change-password-info">
            {info}
          </Text>
          <NewPasswordForm loading={loading} errorMessage={error} onSubmit={handleChange} />
          <Text
            testID="change-password-resend"
            role="button"
            aria-label="Resend OTP"
            onPress={handleResend}
            fontSize={13.5}
            fontWeight="700"
            color="$primary"
            textAlign="center"
          >
            Resend OTP
          </Text>
        </YStack>
      )}
    </SecuritySheet>
  );
}
