import { Link as RouterLink } from 'react-router';
import { Box, Link, Stack } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../../shared/fallback-icons';
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
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <img src={source} alt="" width={28} height={28} style={{ display: 'block', borderRadius: LITE_RADII.control }} />
        <Box component="span" sx={{ display: { xs: 'none', md: 'inline' }, fontWeight: 800, fontSize: '1.05rem', color: 'text.primary' }}>
          {siteName}
        </Box>
      </Stack>
    </Link>
  );
}
