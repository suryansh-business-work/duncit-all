import { Alert, Stack, Typography } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { EnvEntry } from '../queries';
import GoogleOAuthTest from './GoogleOAuthTest';
import { useTranslation } from '@duncit/app-settings';

/** OAuth tab: runs a real sign-in with the entry's client_id. */
export default function GoogleOAuthTab({ entry }: Readonly<{ entry: EnvEntry }>) {
  const { t } = useTranslation();
  const clientId = entry.config.find((p) => p.key === 'client_id')?.value ?? '';
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" sx={{
        color: "text.secondary"
      }}>
        Sign in with Google using this entry's OAuth Client ID — the decoded user profile appears below.
      </Typography>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <GoogleOAuthTest />
        </GoogleOAuthProvider>
      ) : (
        <Alert severity="info">{t('tech.environment.setAnOauthClientIdOn')}</Alert>
      )}
    </Stack>
  );
}
