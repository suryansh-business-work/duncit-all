import { useState } from 'react';

import { TwoFactorForm, type TwoFactorValues } from '@/forms/two-factor';
import { useTranslation } from '@/hooks/useTranslation';
import { NoCrmAccessError, useAuthStore } from '@/stores/auth.store';
import { errorMessage } from '@/utils/errors';
import { AuthLayout } from './AuthLayout';

/** The authenticator code an account with two-step verification owes after its password. */
export function TwoFactorScreen() {
  const { t } = useTranslation();
  const completeTwoFactor = useAuthStore((s) => s.completeTwoFactor);
  const [error, setError] = useState<string | null>(null);

  const submit = async ({ code }: TwoFactorValues) => {
    setError(null);
    try {
      await completeTwoFactor(code);
    } catch (err) {
      setError(
        err instanceof NoCrmAccessError
          ? t('crmApp.login.noAccess')
          : errorMessage(err, t('crmApp.login.failed')),
      );
    }
  };

  return (
    <AuthLayout title={t('crmApp.twoFactor.title')}>
      <TwoFactorForm
        onSubmit={submit}
        onBack={() => useAuthStore.setState({ status: 'signedOut', challengeToken: null })}
        error={error}
      />
    </AuthLayout>
  );
}
