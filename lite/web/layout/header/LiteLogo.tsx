import { Link as RouterLink } from 'react-router';
import { Box, Link } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../../shared/fallback-icons';
import { useWebT } from '../../../shared/i18n';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { paths } from '../../lib/paths';

/** The Duncit Lite mark alone, linking home; the site's name is its accessible name. */
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
      {/* The mark is drawn on a transparent square, so it needs no frame or shadow of its own. */}
      <Box component="img" src={source} alt="" width={40} height={40} sx={{ display: 'block', width: { xs: 36, md: 40 }, height: { xs: 36, md: 40 } }} />
    </Link>
  );
}
