import { useState } from 'react';

import { LoginForm, type LoginFormValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';
import { NoCrmAccessError, useAuthStore } from '@/stores/auth.store';
import { errorMessage } from '@/utils/errors';
import { AuthAlert } from './AuthAlert';
import { AuthLayout } from './AuthLayout';
import { OtpLoginPanel } from './OtpLoginPanel';

/** Sign in as on the CRM portal's login card: e-mail and password, or an emailed code. */
export function LoginScreen() {
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const requestLoginCode = useAuthStore((s) => s.requestLoginCode);
  const signInWithCode = useAuthStore((s) => s.signInWithCode);
  const [error, setError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const word = (err: unknown) =>
    err instanceof NoCrmAccessError
      ? t('crmApp.login.noAccess')
      : errorMessage(err, t('crmApp.login.failed'));

  const submit = async ({ email, password }: LoginFormValues) => {
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(word(err));
    }
  };

  const requestCode = async (email: string) => {
    setOtpError(null);
    try {
      await requestLoginCode(email);
      return true;
    } catch (err) {
      setOtpError(word(err));
      return false;
    }
  };

  const submitCode = async (email: string, code: string) => {
    setOtpError(null);
    try {
      await signInWithCode(email, code);
    } catch (err) {
      setOtpError(word(err));
    }
  };

  return (
    <AuthLayout title={t('session.login.heading')}>
      {error ? <AuthAlert message={error} testID="login-error" /> : null}
      <LoginForm onSubmit={submit} />
      <OtpLoginPanel onRequestCode={requestCode} onSubmitCode={submitCode} error={otpError} />
    </AuthLayout>
  );
}
