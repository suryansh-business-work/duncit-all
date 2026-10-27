import { Link as RouterLink } from 'react-router';
import { Box, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { paths } from '../../lib/paths';
import { useInstallPrompt } from '../../lib/useInstallPrompt';
import { gradientText } from './Hero';

/** "Your next unforgettable memory awaits." with Discover and, where the browser offers it, Get the app. */
export function ClosingCall() {
  const { t } = useWebT();
  const { canInstall, install } = useInstallPrompt();
  return (
    <Box component="section" aria-labelledby="landing-closing" sx={{ textAlign: 'center', py: { xs: 8, md: 12 } }} data-testid="landing-closing">
      <Typography id="landing-closing" variant="h2" component="h2" sx={(theme) => ({ fontSize: { xs: '1.8rem', md: '2.4rem' }, maxWidth: 520, mx: 'auto', ...gradientText(theme) })}>
        {t('liteWeb.landing.closing')}
      </Typography>
      <Stack direction="row" spacing={1.5} sx={{ justifyContent: 'center', mt: 3 }}>
        <DuncitButton component={RouterLink} to={paths.discover} variant="outlined" sx={{ borderRadius: LITE_RADII.pill }} data-testid="landing-closing-discover">
          {t('liteWeb.landing.ctaDiscover')}
        </DuncitButton>
        {canInstall ? (
          <DuncitButton
            variant="text"
            sx={{ borderRadius: LITE_RADII.pill }}
            onClick={() => {
              install().catch(() => notifyError(t('liteWeb.footer.installFailed')));
            }}
            data-testid="landing-install"
          >
            {t('liteWeb.footer.getApp')}
          </DuncitButton>
        ) : null}
      </Stack>
    </Box>
  );
}
