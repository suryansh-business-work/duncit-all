import { Alert, Stack, Typography } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import type { EnvEntry } from '../queries';
import GoogleOAuthTest from './GoogleOAuthTest';

/** OAuth tab: runs a real sign-in with the entry's client_id. */
export default function GoogleOAuthTab({ entry }: { entry: EnvEntry }) {
  const clientId = entry.config.find((p) => p.key === 'client_id')?.value ?? '';
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        Sign in with Google using this entry's OAuth Client ID — the decoded user profile appears below.
      </Typography>
      {clientId ? (
        <GoogleOAuthProvider clientId={clientId}>
          <GoogleOAuthTest />
        </GoogleOAuthProvider>
      ) : (
        <Alert severity="info">Set an OAuth Client ID on this entry to test sign-in.</Alert>
      )}
    </Stack>
  );
}
