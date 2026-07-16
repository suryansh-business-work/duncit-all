import { Divider, Stack } from '@mui/material';
import { PortalLoginPage } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import SendAdminCredentials from '../components/SendAdminCredentials';

// Admin deliberately shows the raw error message instead of parseApiError.
const parseAdminError = (err: unknown) =>
  err instanceof Error ? err.message : 'Login failed. Please try again.';

export default function LoginPage() {
  return (
    <PortalLoginPage
      appConfig={appConfig}
      session={{ setToken, hasAppAccess, accessDeniedMessage }}
      mutationName="AdminLogin"
      defaultRedirect="/hub"
      parseError={parseAdminError}
      footerSlot={
        <Stack spacing={1.5}>
          <Divider>or</Divider>
          <SendAdminCredentials />
        </Stack>
      }
    />
  );
}
