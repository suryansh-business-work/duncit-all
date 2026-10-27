import type { JSX } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Container, Stack, Typography } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import LoginIcon from '@mui/icons-material/Login';
import { DuncitButton } from '@duncit/buttons';
import { PageErrorBoundary, useTranslation } from '@duncit/shell';
import { appConfig } from '../../config/app-config';
import GuidePage from './GuidePage';

interface GuideRouteProps {
  /** The console's login gate + chrome, for a signed-in reader. */
  authed: (element: JSX.Element) => JSX.Element;
  /** The session token, if there is one. */
  getToken: () => string | null;
}

/** The Guide outside the console: no sidebar, just the page and a way in. */
function PublicGuide() {
  const { t } = useTranslation();
  return (
    <Box component="main" sx={{ minHeight: '100dvh', bgcolor: 'background.default', py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Stack spacing={3}>
          <Typography variant="overline" component="p" sx={{ color: 'text.secondary' }}>
            {appConfig.fullName}
          </Typography>
          <GuidePage
            actions={
              <DuncitButton component={RouterLink} to="/login?redirect=%2Fconnect" variant="contained" startIcon={<LoginIcon />}>
                {t('mcp.guide.signIn')}
              </DuncitButton>
            }
          />
        </Stack>
      </Container>
    </Box>
  );
}

/**
 * /guide is open to everyone — the server's OAuth metadata names it as the
 * service documentation, so an AI app's user may land here before they have an
 * account session. Signed in, it is a normal console page with the chrome; not
 * signed in, it stands alone. Either way a crash in it is caught on its own.
 */
export default function GuideRoute({ authed, getToken }: Readonly<GuideRouteProps>) {
  const { t } = useTranslation();
  if (getToken()) {
    return authed(
      <GuidePage
        actions={
          <DuncitButton component={RouterLink} to="/connect" variant="contained" startIcon={<LinkIcon />}>
            {t('mcp.guide.openConnect')}
          </DuncitButton>
        }
      />,
    );
  }
  return (
    <PageErrorBoundary>
      <PublicGuide />
    </PageErrorBoundary>
  );
}
