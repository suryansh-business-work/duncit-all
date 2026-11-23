import { useId, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Dialog, DialogContent, DialogTitle, Divider, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';

import { SIGNUP_URL } from '../../config/env';
import { GOOGLE_SIGN_IN_CONFIG } from '../../graphql/settings';
import { useStoreSession } from '../../app/providers/SessionProvider';
import { useStoreT } from '../../i18n';
import { GoogleSignInButton } from './GoogleSignInButton';
import { OtpSignInForm } from './otp-sign-in';
import { PasswordSignInForm } from './password-sign-in';

type Method = 'PASSWORD' | 'CODE';

/**
 * Sign in to the store: password, a one-time code, or Google. New shoppers are
 * sent to the Duncit signup in a new tab, because accounts are only made there.
 */
export function SignInDialog() {
  const { t } = useStoreT();
  const { dialogOpen, closeSignIn, completeSignIn } = useStoreSession();
  const [method, setMethod] = useState<Method>('PASSWORD');
  const titleId = useId();
  // Asked only once the dialog opens, so a page view (and its server render)
  // never waits on it. Blank hides "Continue with Google" entirely.
  const { data } = useQuery(GOOGLE_SIGN_IN_CONFIG, { fetchPolicy: 'cache-first', skip: !dialogOpen });
  const googleClientId = data?.publicClientConfig.google_client_id.trim() ?? '';
  return (
    <Dialog open={dialogOpen} onClose={closeSignIn} aria-labelledby={titleId} fullWidth maxWidth="xs">
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <DialogTitle id={titleId}>{t('ecommStore.auth.title')}</DialogTitle>
        <DuncitIconButton aria-label={t('ecommStore.auth.close')} onClick={closeSignIn}>
          <CloseIcon />
        </DuncitIconButton>
      </Stack>
      <DialogContent>
        <Stack spacing={2}>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={method}
            aria-label={t('ecommStore.auth.method')}
            onChange={(_event, next: Method | null) => {
              if (next) setMethod(next);
            }}
          >
            <ToggleButton value="PASSWORD">{t('ecommStore.auth.withPassword')}</ToggleButton>
            <ToggleButton value="CODE">{t('ecommStore.auth.withCode')}</ToggleButton>
          </ToggleButtonGroup>
          {method === 'PASSWORD' ? (
            <PasswordSignInForm onToken={completeSignIn} />
          ) : (
            <OtpSignInForm onToken={completeSignIn} />
          )}
          {googleClientId ? (
            <GoogleOAuthProvider clientId={googleClientId}>
              <Divider>{t('ecommStore.auth.or')}</Divider>
              <GoogleSignInButton onToken={completeSignIn} />
            </GoogleOAuthProvider>
          ) : null}
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            {t('ecommStore.auth.newHere')}{' '}
            <Link href={SIGNUP_URL} target="_blank" rel="noopener noreferrer">
              {t('ecommStore.auth.createAccount')}
            </Link>
          </Typography>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
