import { Box, Container, Link, Stack, Typography } from '@mui/material';
import { LanguageSelect } from '@duncit/ui';
import { useWebT } from '../../shared/i18n';
import { useLiteSettings } from '../app/providers/LiteSettingsProvider';

/** The site's name, its tagline, the support address and — on a phone — the language switcher. */
export function Footer() {
  const { t, locale, locales, setLocale } = useWebT();
  const { site_name: siteName, support_email: supportEmail } = useLiteSettings();
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper', mt: 6, pb: { xs: 10, md: 0 } }} data-testid="footer">
      <Container maxWidth={false} sx={{ maxWidth: 1100, py: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between', alignItems: { md: 'center' } }}>
          <Stack spacing={0.5}>
            <Typography sx={{ fontWeight: 800 }}>{siteName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('liteWeb.footer.tagline')}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            {supportEmail ? (
              <Link href={`mailto:${supportEmail}`} sx={{ fontWeight: 700 }} data-testid="footer-support">
                {t('liteWeb.footer.support')}: {supportEmail}
              </Link>
            ) : null}
            <Box sx={{ display: { xs: 'block', md: 'none' }, minWidth: 200 }}>
              <LanguageSelect value={locale} options={locales} onChange={setLocale} size="small" />
            </Box>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
