import { Divider, Link, Stack, Typography } from '@mui/material';
import { useWebT } from '../../../shared/i18n';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SignInForm } from './sign-in';

/** The whole sign-in door: the code form, Google when configured, and the Duncit note. Shared by the dialog and /signin. */
export function SignInPanel() {
  const { t } = useWebT();
  const { google_client_id: googleClientId, sign_in_with_duncit: withDuncit, duncit_app_url: duncitUrl } = useLiteSettings();
  return (
    <Stack spacing={2} data-testid="sign-in-panel">
      <SignInForm />
      {googleClientId ? (
        <>
          <Divider>{t('lite.auth.or')}</Divider>
          <GoogleSignInButton />
        </>
      ) : null}
      {withDuncit ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          {t('lite.auth.duncitNote')}{' '}
          {duncitUrl ? (
            <Link href={duncitUrl} target="_blank" rel="noopener noreferrer" data-testid="sign-in-duncit-link">
              {t('liteWeb.signIn.openDuncit')}
            </Link>
          ) : null}
        </Typography>
      ) : null}
    </Stack>
  );
}
