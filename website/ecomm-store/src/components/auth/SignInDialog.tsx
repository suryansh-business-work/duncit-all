import { useId, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, Divider, Link, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitIconButton } from '@duncit/buttons';

import { GOOGLE_CLIENT_ID, SIGNUP_URL } from '../../config/env';
import { useStoreSession } from '../../app/providers/SessionProvider';
import { useStoreT } from '../../i18n';
import { GoogleSignInButton } from './GoogleSignInButton';
import { OtpSignInForm } from './otp-sign-in';
import { PasswordSignInForm } from './password-sign-in';

type Method = 'PASSWORD' | 'CODE';

/**
 * Sign in to the store: password, a one-time code, or Google. New shoppers are
 * sent to the Duncit signup in a new tab — accounts are made there, not here.
 */
export function SignInDialog() {
  const { t } = useStoreT();
  const { dialogOpen, closeSignIn, completeSignIn } = useStoreSession();
  const [method, setMethod] = useState<Method>('PASSWORD');
  const titleId = useId();
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
          {GOOGLE_CLIENT_ID ? (
            <>
              <Divider>{t('ecommStore.auth.or')}</Divider>
              <GoogleSignInButton onToken={completeSignIn} />
            </>
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
