import { useState } from 'react';
import { Alert, Box, Chip, Fade, IconButton, Link, Snackbar, Stack, Tooltip, Typography } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { glass } from './glass';
import LoginForm from './login.form';
import PromoCard from './PromoCard';
import OtherPortalsDialog from './OtherPortalsDialog';
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
  footerSlot,
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
          background: dark
            ? 'linear-gradient(180deg, rgba(3,6,15,0.72) 0%, rgba(3,6,15,0.88) 100%)'
            : 'linear-gradient(180deg, rgba(248,250,252,0.62) 0%, rgba(226,232,240,0.78) 100%)',
          zIndex: 1,
        }}
      />

      <Tooltip title={dark ? 'Switch to light' : 'Switch to dark'}>
        <IconButton
          onClick={onToggleMode}
          aria-label="toggle color mode"
          sx={{ position: 'fixed', top: 16, right: 16, zIndex: 3, color: dark ? '#fff' : 'text.primary' }}
        >
          {dark ? <LightModeIcon /> : <DarkModeIcon />}
        </IconButton>
      </Tooltip>

      <Fade in timeout={500}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2.5}
          alignItems="stretch"
          sx={{ position: 'relative', zIndex: 2, p: 2, width: '100%', maxWidth: 760, justifyContent: 'center' }}
        >
          <Stack spacing={2} sx={{ width: '100%', maxWidth: 380, mx: { xs: 'auto', md: 0 } }}>
            <Box sx={(theme) => ({ ...glass(theme), borderRadius: 4, p: { xs: 3, sm: 3.5 } })}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Box component="img" src={config.logoUrl} alt={config.portalName} sx={{ height: 26, width: 'auto', maxWidth: 110, objectFit: 'contain' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 0.2 }}>
                    duncit.com
                  </Typography>
                </Stack>
                <Chip label={config.portalName} size="small" color="primary" variant="outlined" sx={{ fontWeight: 700 }} />
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 800, mb: 2 }}>
                Log in
              </Typography>
              {errorMessage && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {errorMessage}
                </Alert>
              )}
              <LoginForm
                loading={loading}
                onSubmit={onSubmit}
                onForgotPassword={() => setSnack('Contact your administrator to reset your password.')}
              />
              {footerSlot && <Box sx={{ mt: 2 }}>{footerSlot}</Box>}

              <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" sx={{ mt: 2.5 }}>
                <Link href={config.privacyUrl ?? DEFAULT_PRIVACY} target="_blank" rel="noopener" underline="none" color="text.secondary" sx={legalLink}>
                  Privacy Policy
                </Link>
                <Box sx={{ color: 'text.disabled' }}>·</Box>
                <Link href={config.termsUrl ?? DEFAULT_TERMS} target="_blank" rel="noopener" underline="none" color="text.secondary" sx={legalLink}>
                  Terms of Use
                </Link>
                <Box sx={{ color: 'text.disabled' }}>·</Box>
                <Link component="button" type="button" onClick={() => setPortalsOpen(true)} underline="none" color="primary" sx={legalLink}>
                  Other portals
                </Link>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Trouble signing in? Email{' '}
                <Link href={`mailto:${contact}`} underline="none" color="primary" fontWeight={700}>
                  {contact}
                </Link>{' '}
                and our team will help you get back in.
              </Typography>
            </Box>

            <Box sx={{ bgcolor: '#0b0b0f', color: '#fff', borderRadius: 3, px: 2.5, py: 1.75, textAlign: 'center' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {config.tagline}
              </Typography>
            </Box>
          </Stack>

          <Box sx={{ display: { xs: 'none', md: 'block' }, width: 320, flexShrink: 0 }}>
            <PromoCard title={config.promoTitle} text={config.promoText} brandName={config.brandName} />
          </Box>
        </Stack>
      </Fade>

      <OtherPortalsDialog open={portalsOpen} onClose={() => setPortalsOpen(false)} />

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
