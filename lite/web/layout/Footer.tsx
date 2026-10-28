import { motion } from 'framer-motion';
import { Box, Container, Divider, Stack, Typography } from '@mui/material';
import type { Theme } from '@mui/material/styles';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import InstallMobileOutlinedIcon from '@mui/icons-material/InstallMobileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { notifyError } from '@duncit/dialogs';
import { LanguageSelect } from '@duncit/ui';
import { resolveIconSource } from '@duncit/fallback-icons';
import { LITE_FALLBACK_ICONS } from '../../shared/fallback-icons';
import { useWebT } from '../../shared/i18n';
import { tint } from '../../shared/theme';
import { HEADLINE_GRADIENT, HEADLINE_GRADIENT_LIGHT, LITE_RADII } from '../../shared/tokens';
import { useLiteSettings } from '../app/providers/LiteSettingsProvider';
import { useCanObserve } from '../lib/motion';
import { useInstallPrompt } from '../lib/useInstallPrompt';
import { FooterColumns } from './footer/FooterColumns';

const gradient = ([from, to]: readonly [string, string]) => `linear-gradient(90deg, ${from}, ${to})`;

/** The site's name as a giant gradient wordmark sinking into the bottom edge. Decorative. */
const wordmark = (theme: Theme) => ({
  display: 'block',
  fontWeight: 900,
  lineHeight: 0.8,
  letterSpacing: '-0.05em',
  // Sized to the viewport so the whole name fits on any width (about 0.5em a letter).
  fontSize: { xs: '15vw', md: 'min(11vw, 9.5rem)' },
  whiteSpace: 'nowrap' as const,
  textAlign: 'center' as const,
  userSelect: 'none' as const,
  backgroundImage: gradient(HEADLINE_GRADIENT),
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  opacity: 0.9,
  ...theme.applyStyles('light', { backgroundImage: gradient(HEADLINE_GRADIENT_LIGHT) }),
});

/** The mark and promise, Explore / Host / Help, the language, "Get the app", and the big wordmark. */
export function Footer() {
  const { t, locale, locales, setLocale } = useWebT();
  const { site_name: siteName } = useLiteSettings();
  const { canInstall, install } = useInstallPrompt();
  const { source } = resolveIconSource(null, LITE_FALLBACK_ICONS.logo);
  // The wordmark rises in once it scrolls into view, where the browser can tell.
  const rise = useCanObserve() ? { initial: { opacity: 0, y: 60 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.2 } } : {};
  return (
    <Box component="footer" sx={(theme) => ({ position: 'relative', mt: 10, overflow: 'hidden', borderTop: 1, borderColor: 'divider', backgroundImage: `radial-gradient(80% 60% at 50% 120%, ${tint(theme.palette.primary.main, 0.16)}, transparent)` })} data-testid="footer">
      <Container maxWidth={false} sx={{ maxWidth: 1040, pt: { xs: 5, md: 7 } }}>
        <Stack component="nav" aria-label={t('liteWeb.footer.label')} direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 4, md: 6 }} sx={{ justifyContent: 'space-between' }}>
          <Stack spacing={1.5} sx={{ maxWidth: 320 }}>
            <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
              {/* The same mark as the header, in grey: the footer stays quiet. */}
              <img src={source} alt={siteName} width={40} height={40} style={{ display: 'block', filter: 'grayscale(1)' }} />
              <Typography component="span" sx={{ fontWeight: 800, fontSize: '1.2rem' }}>
                {siteName}
              </Typography>
            </Stack>
            <Typography color="text.secondary">{t('liteWeb.footer.madeFor')}</Typography>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1.5, pt: 0.5 }}>
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
          <Box sx={{ flexGrow: 1, maxWidth: { md: 520 } }}>
            <FooterColumns />
          </Box>
        </Stack>
        <Divider sx={{ mt: { xs: 4, md: 6 }, mb: 2 }} />
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="body2" color="text.secondary">
            {t('liteWeb.footer.copyright', { vars: { year: new Date().getFullYear(), name: siteName } })}
          </Typography>
          <DuncitButton variant="text" size="small" endIcon={<ArrowUpwardIcon />} onClick={() => globalThis.scrollTo({ top: 0, behavior: 'smooth' })} data-testid="footer-top">
            {t('liteWeb.footer.backToTop')}
          </DuncitButton>
        </Stack>
      </Container>
      <Box
        component={motion.span}
        aria-hidden
        {...rise}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        sx={(theme: Theme) => ({ ...wordmark(theme), mt: { xs: 3, md: 4 }, mb: { xs: '-4vw', md: '-2.5rem' } })}
      >
        {siteName}
      </Box>
    </Box>
  );
}
