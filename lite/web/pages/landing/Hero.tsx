import { Link as RouterLink, useNavigate } from 'react-router';
import { Box, Link, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useWebT } from '../../../shared/i18n';
import { HEADLINE_GRADIENT, HEADLINE_GRADIENT_LIGHT, LITE_RADII } from '../../../shared/tokens';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { useSignInPrompt } from '../../app/providers/SignInPromptProvider';
import { paths } from '../../lib/paths';
import { FloatingCovers } from './FloatingCovers';

const gradient = ([from, to]: readonly [string, string]) => `linear-gradient(90deg, ${from}, ${to})`;

/** The words that carry the gradient, Duncit's red into amber (deeper stops on the light page). */
export const gradientText = (theme: Theme) => ({
  background: gradient(HEADLINE_GRADIENT),
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  ...theme.applyStyles('light', { background: gradient(HEADLINE_GRADIENT_LIGHT) }),
});

/** The site name, "Delightful events / start here", one line of why, and the two ways in. */
export function Hero({ covers }: Readonly<{ covers: readonly string[] }>) {
  const { t } = useWebT();
  const { site_name: siteName } = useLiteSettings();
  const { requireSignIn } = useSignInPrompt();
  const navigate = useNavigate();
  const create = async () => {
    if (await requireSignIn()) navigate(paths.create);
  };
  return (
    <Box component="section" aria-labelledby="landing-title" sx={{ position: 'relative', minHeight: { xs: 560, md: 640 }, display: 'grid', placeItems: 'center', px: 2 }} data-testid="landing-hero">
      <FloatingCovers covers={covers} />
      <Stack spacing={2.5} sx={{ position: 'relative', alignItems: 'center', textAlign: 'center', maxWidth: 560, animation: 'lite-rise 700ms both' }} data-lite-animate>
        <Typography variant="h6" component="p" color="text.secondary" sx={{ fontWeight: 600 }}>
          {siteName}
        </Typography>
        <Typography id="landing-title" variant="h1">
          {t('liteWeb.landing.titleLead')}
          <Box component="span" sx={(theme) => ({ display: 'block', ...gradientText(theme) })}>
            {t('liteWeb.landing.titleAccent')}
          </Box>
        </Typography>
        <Typography color="text.secondary" sx={{ fontSize: { xs: '1rem', md: '1.15rem' }, maxWidth: 440 }}>
          {t('liteWeb.landing.body')}
        </Typography>
        <DuncitButton
          variant="contained"
          size="large"
          onClick={() => {
            create().catch((error: unknown) => notifyError(parseApiError(error)));
          }}
          sx={{ borderRadius: LITE_RADII.pill, px: 3 }}
          data-testid="landing-create"
        >
          {t('liteWeb.landing.ctaCreate')}
        </DuncitButton>
        <Link component={RouterLink} to={paths.discover} underline="hover" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }} data-testid="landing-discover">
          {t('liteWeb.landing.ctaDiscover')}
          <ArrowForwardIcon sx={{ fontSize: 16 }} aria-hidden />
        </Link>
      </Stack>
    </Box>
  );
}
