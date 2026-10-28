import { Link as RouterLink } from 'react-router';
import { Box, Link, Stack } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../../shared/fallback-icons';
import { tint } from '../../../shared/theme';
import { useWebT } from '../../../shared/i18n';
import { LITE_RADII } from '../../../shared/tokens';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { paths } from '../../lib/paths';

/** The mark and (from a small tablet up) the site's name, linking home. */
export function LiteLogo() {
  const { t } = useWebT();
  const { site_name: siteName } = useLiteSettings();
  const { source } = resolveIconSource(null, LITE_FALLBACK_ICONS.logo);
  return (
    <Link
      component={RouterLink}
      to={paths.home}
      underline="none"
      aria-label={t('liteWeb.nav.home', { vars: { name: siteName } })}
      sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, mr: { xs: 0.5, md: 2 } }}
      data-testid="header-logo"
    >
      <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
        <Box
          component="img"
          src={source}
          alt=""
          width={40}
          height={40}
          sx={(theme) => ({ display: 'block', width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 }, borderRadius: `${LITE_RADII.control + 2}px`, boxShadow: `0 4px 14px ${tint(theme.palette.primary.main, 0.35)}` })}
        />
        <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, whiteSpace: 'nowrap', fontWeight: 800, fontSize: { sm: '1.1rem', md: '1.2rem' }, letterSpacing: '-0.01em', color: 'text.primary' }}>
          {siteName}
        </Box>
      </Stack>
    </Link>
  );
}
