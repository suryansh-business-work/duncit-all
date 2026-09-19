import { Navigate } from 'react-router';
import { Box, Container, Paper, Stack, Typography } from '@mui/material';
import { Loader } from '@duncit/ui';
import { LITE_FALLBACK_ICONS } from '../../../shared/fallback-icons';
import { usePortalT } from '../../../shared/i18n';
import { useLiteSession } from '../../../shared/session';
import { SignInForm } from './sign-in';

/** The console's one public page. A signed-in account is sent to the dashboard (or the not-admin notice). */
export function LoginPage() {
  const { t } = usePortalT();
  const { signedIn, resolving } = useLiteSession();
  if (resolving) return <Loader variant="page" label={t('litePortal.app.resolving')} />;
  if (signedIn) return <Navigate to="/" replace />;

  return (
    <Box component="main" id="login-main" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="xs" sx={{ py: 4 }}>
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 } }}>
          <Stack spacing={2}>
            <Box component="img" src={LITE_FALLBACK_ICONS.logo} alt="" sx={{ height: 40, width: 40, alignSelf: 'flex-start' }} />
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {t('litePortal.login.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('litePortal.login.tagline')}
            </Typography>
            <SignInForm />
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
