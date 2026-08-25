import { useState } from 'react';
import { Alert, Box, Chip, Fade, IconButton, Link, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { glass, inkCta } from './glass';
import LoginForm from './login.form';
import PromoCard from './PromoCard';
import OtherPortalsDialog from './OtherPortalsDialog';
import { sessionT } from '../i18n';
import type { LoginScreenProps } from './login.types';

const DEFAULT_PRIVACY = 'https://duncit.com/privacy-policy';
const DEFAULT_TERMS = 'https://duncit.com/terms-of-use';
const DEFAULT_CONTACT = 'admin@duncit.com';

export default function LoginScreen({
  config,
  mode,
  onToggleMode,
  loading,
  errorMessage,
  onSubmit,
  altSlot,
  footerSlot,
  t = sessionT,
}: Readonly<LoginScreenProps>) {
  const [snack, setSnack] = useState<string | null>(null);
  const [portalsOpen, setPortalsOpen] = useState(false);
  const dark = mode === 'dark';
  const contact = config.contactEmail ?? DEFAULT_CONTACT;

  const legalLink = { fontSize: 12, fontWeight: 600 } as const;

  return (
    <Box sx={{ position: 'relative', minHeight: '100dvh', width: '100%', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      {/* foggy background */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url("${config.bgImage}")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2.5px)',
          transform: 'scale(1.06)',
          zIndex: 0,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          inset: 0,
          backdropFilter: 'blur(1.5px)',
          WebkitBackdropFilter: 'blur(1.5px)',
          background: (theme) =>
            dark
              ? `linear-gradient(180deg, ${alpha(theme.palette.common.black, 0.72)} 0%, ${alpha(theme.palette.common.black, 0.88)} 100%)`
              : `linear-gradient(180deg, ${alpha(theme.palette.common.white, 0.62)} 0%, ${alpha(theme.palette.grey[300], 0.78)} 100%)`,
          zIndex: 1,
        }}
      />

      <Tooltip title={dark ? t('session.login.switchToLight') : t('session.login.switchToDark')}>
        <IconButton
          onClick={onToggleMode}
          aria-label={t('session.login.toggleColorMode')}
          sx={{ position: 'fixed', top: 16, right: 16, zIndex: 3, color: 'text.primary' }}
        >
          {dark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>

      <Fade in timeout={500}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          sx={{
            alignItems: "stretch",
            position: 'relative',
            zIndex: 2,
            p: 2,
            width: '100%',
            maxWidth: 760,
            justifyContent: 'center'
          }}>
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 380, mx: { xs: 'auto', md: 0 } }}>
            <Box sx={(theme) => ({ ...glass(theme), borderRadius: 4, p: { xs: 3, sm: 3.5 } })}>
              <Stack
                direction="row"
                sx={{
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2
                }}>
                <Stack direction="row" spacing={1} sx={{
                  alignItems: "center"
                }}>
                  <Box component="img" src={config.logoUrl} alt={config.portalName} onError={config.onLogoError} sx={{ height: 26, width: 'auto', maxWidth: 110, objectFit: 'contain' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                    duncit.com
                  </Typography>
                </Stack>
                <Chip label={config.portalName} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                {t('session.login.heading')}
              </Typography>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}
              <LoginForm
                loading={loading}
                onSubmit={onSubmit}
                t={t}
                onForgotPassword={() => setSnack(t('session.login.forgotPasswordHint'))}
              />
              {/* Directly under the password button, because it is the other
                  way through the same door — not an afterthought below the
                  legal links. */}
              {altSlot && <Box sx={{ mt: 2 }}>{altSlot}</Box>}
              {footerSlot && <Box sx={{ mt: 2 }}>{footerSlot}</Box>}

              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  alignItems: "center",
                  flexWrap: "wrap",
                  mt: 2.5
                }}>
                <Link
                  href={config.privacyUrl ?? DEFAULT_PRIVACY}
                  target="_blank"
                  rel="noopener"
                  underline="none"
                  sx={[{
                    color: "text.secondary"
                  }, ...(Array.isArray(legalLink) ? legalLink : [legalLink])]}>
                  {t('session.login.privacyPolicy')}
                </Link>
                <Box sx={{ color: 'text.disabled' }}>·</Box>
                <Link
                  href={config.termsUrl ?? DEFAULT_TERMS}
                  target="_blank"
                  rel="noopener"
                  underline="none"
                  sx={[{
                    color: "text.secondary"
                  }, ...(Array.isArray(legalLink) ? legalLink : [legalLink])]}>
                  {t('session.login.termsOfUse')}
                </Link>
                <Box sx={{ color: 'text.disabled' }}>·</Box>
                <Link component="button" type="button" onClick={() => setPortalsOpen(true)} underline="none" color="primary" sx={legalLink}>
                  {t('session.login.otherPortals')}
                </Link>
              </Stack>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  display: 'block',
                  mt: 1
                }}>
                {t('session.login.supportPrefix')}{' '}
                <Link href={`mailto:${contact}`} underline="none" color="primary" sx={{
                  fontWeight: 700
                }}>
                  {contact}
                </Link>{' '}
                {t('session.login.supportSuffix')}
              </Typography>
            </Box>

            <Box sx={{ bgcolor: inkCta.bgcolor, color: inkCta.color, borderRadius: 3, px: 2.5, py: 1.75, textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {config.tagline}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 320, flexShrink: 0 }}>
            <PromoCard
              title={config.promoTitle}
              text={config.promoText}
              brandName={config.brandName}
              t={t}
            />
          </Box>
        </Stack>
      </Fade>

      <OtherPortalsDialog open={portalsOpen} onClose={() => setPortalsOpen(false)} t={t} />

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack(null)}
        message={snack ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Box>
  );
}
