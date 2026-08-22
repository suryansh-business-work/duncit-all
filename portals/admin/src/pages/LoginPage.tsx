import { Divider, Stack } from '@mui/material';
import { PortalLoginPage } from '@duncit/shell';
import { appConfig } from '../config/app-config';
import { accessDeniedMessage, hasAppAccess, setToken } from '../lib/session';
import SendAdminCredentials from '../components/SendAdminCredentials';
import { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];

// Admin deliberately shows the raw error message instead of parseApiError.
const parseAdminError = (err: unknown, t: Translate) =>
  err instanceof Error ? err.message : t('admin.login.failed');

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <PortalLoginPage
      appConfig={appConfig}
      session={{ setToken, hasAppAccess, accessDeniedMessage }}
      mutationName="AdminLogin"
      defaultRedirect="/hub"
      parseError={(err: unknown) => parseAdminError(err, t)}
      footerSlot={
        <Stack spacing={1.5}>
          <Divider>or</Divider>
          <SendAdminCredentials />
        </Stack>
      }
    />
  );
}
