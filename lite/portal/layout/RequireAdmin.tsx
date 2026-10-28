import { Navigate, Outlet, useLocation } from 'react-router';
import { Alert, Box, Container, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { Loader } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { usePortalT } from '../../shared/i18n';
import { useLiteSession } from '../../shared/session';

/** A signed-in account without `is_admin`: the one door out is signing out. */
function NotAdmin() {
  const { t } = usePortalT();
  const { me, signOut } = useLiteSession();
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {t('litePortal.login.notAdminTitle')}
        </Typography>
        <Alert severity="warning" data-testid="not-admin">
          {t('litePortal.login.notAdmin')}
        </Alert>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('litePortal.app.signedInAs', { vars: { email: me?.email ?? '' } })}
        </Typography>
        <Box>
          <DuncitButton variant="contained" onClick={() => signOut()} data-testid="not-admin-sign-out">
            {t('lite.common.signOut')}
          </DuncitButton>
        </Box>
      </Stack>
    </Container>
  );
}

/** A stored session the API could not be asked about: say why, and let them try again or sign out. */
function SessionUnreadable({ error }: Readonly<{ error: unknown }>) {
  const { t } = usePortalT();
  const { refresh, signOut } = useLiteSession();
  const retry = () => refresh().catch((failure: unknown) => notifyError(parseApiError(failure)));
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
          {t('litePortal.app.sessionErrorTitle')}
        </Typography>
        <Alert severity="error" data-testid="session-error">
          {parseApiError(error)}
        </Alert>
        <Stack direction="row" spacing={1}>
          <DuncitButton variant="contained" onClick={retry} data-testid="session-retry">
            {t('lite.common.retry')}
          </DuncitButton>
          <DuncitButton variant="text" onClick={() => signOut()} data-testid="session-sign-out">
            {t('lite.common.signOut')}
          </DuncitButton>
        </Stack>
      </Stack>
    </Container>
  );
}

/** Every console route: signed in AND an admin, or the sign-in page. */
export function RequireAdmin() {
  const { t } = usePortalT();
  const { signedIn, me, resolving, error } = useLiteSession();
  const location = useLocation();
  if (resolving) return <Loader variant="page" label={t('litePortal.app.resolving')} />;
  if (!signedIn) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!me && error) return <SessionUnreadable error={error} />;
  if (!me?.is_admin) return <NotAdmin />;
  return <Outlet />;
}
