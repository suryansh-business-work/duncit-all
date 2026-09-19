import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { GoogleLogin } from '@react-oauth/google';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { LITE_SIGN_IN_WITH_GOOGLE, type LiteMe } from '../../../shared/graphql/documents';
import { useWebT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';

/** Google's own button, whose id_token the API trades for a session. Rendered only under a configured client id. */
export function GoogleSignInButton() {
  const { t } = useWebT();
  const { completeSignIn } = useLiteSession();
  const [error, setError] = useState('');
  const [signInWithGoogle] = useMutation<{ liteSignInWithGoogle: { token: string; user: LiteMe } }, { id_token: string }>(LITE_SIGN_IN_WITH_GOOGLE);

  const exchange = async (idToken: string) => {
    setError('');
    try {
      const { data } = await signInWithGoogle({ variables: { id_token: idToken } });
      const token = data?.liteSignInWithGoogle.token;
      if (token) await completeSignIn(token);
    } catch (err) {
      setError(parseApiError(err, t('liteWeb.signIn.googleFailed')));
    }
  };

  return (
    <Stack spacing={1} sx={{ alignItems: 'center' }} data-testid="google-sign-in">
      <GoogleLogin
        text="continue_with"
        width={320}
        onSuccess={(response) => {
          if (response.credential) exchange(response.credential).catch((err: unknown) => setError(parseApiError(err)));
        }}
        onError={() => setError(t('liteWeb.signIn.googleFailed'))}
      />
      <Stack aria-live="assertive" sx={{ width: '100%' }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
      </Stack>
    </Stack>
  );
}
