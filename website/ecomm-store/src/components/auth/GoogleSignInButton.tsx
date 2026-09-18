import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { GoogleLogin } from '@react-oauth/google';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';

import { LOGIN_WITH_GOOGLE } from '../../graphql/account';
import { useStoreT } from '../../i18n';

/**
 * "Continue with Google" — Google's own button, whose id_token the API trades
 * for a session. Rendered only when a client id was configured (the dialog
 * decides), because the provider is not mounted otherwise.
 */
export function GoogleSignInButton({ onToken }: Readonly<{ onToken: (token: string) => Promise<void> }>) {
  const { t } = useStoreT();
  const [error, setError] = useState('');
  const [loginWithGoogle] = useMutation(LOGIN_WITH_GOOGLE);

  const exchange = async (idToken: string) => {
    setError('');
    try {
      const { data } = await loginWithGoogle({ variables: { input: { id_token: idToken } } });
      if (data?.loginWithGoogle.token) await onToken(data.loginWithGoogle.token);
    } catch (err) {
      setError(parseApiError(err, t('ecommStore.auth.googleFailed')));
    }
  };

  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }}>
      <GoogleLogin
        text="continue_with"
        width={320}
        onSuccess={(response) => {
          if (response.credential) {
            exchange(response.credential).catch((err: unknown) => setError(parseApiError(err)));
          }
        }}
        onError={() => setError(t('ecommStore.auth.googleFailed'))}
      />
      <Stack aria-live="assertive" sx={{ width: '100%' }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Stack>
  );
}
