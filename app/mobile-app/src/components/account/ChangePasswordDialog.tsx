import type { Translate } from '@/i18n/fallback';
import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
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
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface ChangePasswordDialogProps {
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

const errMsg = (e: unknown, t: Translate) =>
  e instanceof Error ? e.message : t('mweb.account.somethingWentWrong');

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
      <YStack gap={12}>
        <Text fontSize={13.5} color="$muted">
          {t('mweb.changePassword.currentPasswordStepHint')}
        </Text>
        <CurrentPasswordForm loading={loading} errorMessage={errorMessage} onSubmit={onSubmit} />
      </YStack>
    );
  }

  return (
    <YStack gap={12}>
      <Text fontSize={13.5} color="$muted">
        {t('mweb.changePassword.createStepHint')}
      </Text>
      {errorMessage ? (
        <Text fontSize={14} color="$danger" testID="create-password-error">
          {errorMessage}
        </Text>
      ) : null}
      <PrimaryButton
        testID="change-password-send-code"
        label={t('mweb.account.sendCode')}
        loading={loading}
        onPress={onSendCode}
      />
    </YStack>
  );
}

/** Two-step password sheet (Tamagui) — RN twin of mWeb's dialog: prove the
 * current password (or, with none, just ask for the code) → OTP + new password. */
export function ChangePasswordDialog({
  open,
  hasPassword,
  onClose,
  onChanged,
}: Readonly<ChangePasswordDialogProps>) {
  const { t } = useTranslation();
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

  // An empty password means there is none to send: the server reads that as the
  // create path rather than a wrong current password.
  const sendOtp = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const input = password ? { current_password: password } : {};
      await graphqlRequest(MobileRequestPasswordChangeOtpDocument, { input }, { auth: true });
      setCurrentPassword(password);
      setStep(2);
      setInfo(t('mweb.changePassword.otpSentToYourEmail'));
    } finally {
      setLoading(false);
    }
  };

  const handleRequest = async (values: CurrentPasswordValues) => {
    try {
      await sendOtp(values.current_password);
    } catch (e) {
      setError(errMsg(e, t));
    }
  };

  const handleSendCode = () => {
    sendOtp('').catch((e) => setError(errMsg(e, t)));
  };

  const handleResend = () => {
    sendOtp(currentPassword).catch((e) => setError(errMsg(e, t)));
  };

  const handleChange = async (values: NewPasswordValues) => {
    if (values.new_password === currentPassword) {
      setError(t('mweb.changePassword.mustDifferFromCurrent'));
      return;
    }
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
      setError(errMsg(e, t));
    } finally {
      setLoading(false);
    }
  };

  const title = hasPassword ? t('mweb.account.changePassword') : t('mweb.account.createPassword');

  return (
    <SecuritySheet open={open} title={title} testID="change-password-dialog" onClose={close}>
      {step === 1 ? (
        <RequestStep
          hasPassword={hasPassword}
          loading={loading}
          errorMessage={error}
          onSubmit={handleRequest}
          onSendCode={handleSendCode}
        />
      ) : (
        <YStack gap={12}>
          <Text fontSize={13.5} color="$primary" testID="change-password-info">
            {info}
          </Text>
          <NewPasswordForm loading={loading} errorMessage={error} onSubmit={handleChange} />
          <Text
            pressStyle={PRESS_STYLE.inline}
            testID="change-password-resend"
            role="button"
            aria-label={t('mweb.account.resendOtp')}
            onPress={handleResend}
            fontSize={14}
            fontWeight="600"
            color="$primary"
            textAlign="center"
          >
            {t('mweb.account.resendOtp')}
          </Text>
        </YStack>
      )}
    </SecuritySheet>
  );
}
