import { Link as RouterLink } from 'react-router';
import { Box, Container, Divider, Link, Stack } from '@mui/material';
import InstallMobileOutlinedIcon from '@mui/icons-material/InstallMobileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { LanguageSelect } from '@duncit/ui';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../shared/fallback-icons';
import { useWebT } from '../../shared/i18n';
import { LITE_RADII } from '../../shared/tokens';
import { useLiteSettings } from '../app/providers/LiteSettingsProvider';
import { paths } from '../lib/paths';
import { useInstallPrompt } from '../lib/useInstallPrompt';

const FOOT_LINK = { color: 'text.secondary', fontWeight: 600, fontSize: '0.9rem', '&:hover': { color: 'text.primary' } } as const;

/** The mark, Discover and Help, the language, and "Get the app" where the browser can install it. */
export function Footer() {
  const { t, locale, locales, setLocale } = useWebT();
  const { site_name: siteName, support_email: supportEmail } = useLiteSettings();
  const { canInstall, install } = useInstallPrompt();
  const { source } = resolveIconSource(null, LITE_FALLBACK_ICONS.logo);
  return (
    <Box component="footer" sx={{ position: 'relative', mt: 8 }} data-testid="footer">
      <Container maxWidth={false} sx={{ maxWidth: 1040, pb: 4 }}>
        <Divider sx={{ mb: 3 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Stack component="nav" aria-label={t('liteWeb.footer.label')} direction="row" spacing={2.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <img src={source} alt={siteName} width={22} height={22} style={{ display: 'block', borderRadius: LITE_RADII.control }} />
            <Link component={RouterLink} to={paths.discover} underline="none" sx={FOOT_LINK} data-testid="footer-discover">
              {t('liteWeb.nav.discover')}
            </Link>
            {supportEmail ? (
              <Link href={`mailto:${supportEmail}`} underline="none" sx={FOOT_LINK} data-testid="footer-support">
                {t('liteWeb.footer.help')}
              </Link>
            ) : null}
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Box sx={{ minWidth: 180 }}>
              <LanguageSelect value={locale} options={locales} onChange={setLocale} size="small" />
            </Box>
            {canInstall ? (
              <DuncitButton
                variant="outlined"
                size="small"
                startIcon={<InstallMobileOutlinedIcon />}
                sx={{ borderRadius: LITE_RADII.pill }}
                onClick={() => {
                  install().catch(() => notifyError(t('liteWeb.footer.installFailed')));
                }}
                data-testid="footer-install"
              >
                {t('liteWeb.footer.getApp')}
              </DuncitButton>
            ) : null}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
