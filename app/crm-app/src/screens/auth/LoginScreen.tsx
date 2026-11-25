import { useState } from 'react';

import { LoginForm, type LoginFormValues } from '@/forms/login';
import { useTranslation } from '@/hooks/useTranslation';
import { NoCrmAccessError, useAuthStore } from '@/stores/auth.store';
import { errorMessage } from '@/utils/errors';
import { AuthLayout } from './AuthLayout';

/** Sign in with the CRM email and password — the CRM portal's own sign-in. */
export function LoginScreen() {
  const { t } = useTranslation();
  const signIn = useAuthStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ email, password }: LoginFormValues) => {
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof NoCrmAccessError
          ? t('crmApp.login.noAccess')
          : errorMessage(err, t('crmApp.login.failed')),
      );
    }
  };

  return (
    <AuthLayout title={t('crmApp.login.submit')} subtitle={t('crmApp.login.subtitle')}>
      <LoginForm onSubmit={submit} error={error} />
    </AuthLayout>
  );
}
