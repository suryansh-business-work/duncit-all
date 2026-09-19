import { Link as RouterLink } from 'react-router';
import { Link, Stack, Typography } from '@mui/material';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../../shared/fallback-icons';
import { useWebT } from '../../../shared/i18n';
import { useLiteSettings } from '../../app/providers/LiteSettingsProvider';
import { paths } from '../../lib/paths';

/** The mark and the site's name, linking home. */
export function LiteLogo() {
  const { t } = useWebT();
  const { site_name: siteName } = useLiteSettings();
  const { source } = resolveIconSource(null, LITE_FALLBACK_ICONS.logo);
  return (
    <Link
      component={RouterLink}
      to={paths.discover}
      underline="none"
      aria-label={t('liteWeb.nav.home', { vars: { name: siteName } })}
      sx={{ display: 'inline-flex', alignItems: 'center', minHeight: 44 }}
      data-testid="header-logo"
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <img src={source} alt="" width={32} height={32} style={{ display: 'block', borderRadius: 8 }} />
        <Typography component="span" sx={{ fontWeight: 800, fontSize: '1.15rem', color: 'text.primary' }}>
          {siteName}
        </Typography>
      </Stack>
    </Link>
  );
}
