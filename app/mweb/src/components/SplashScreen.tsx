import { Box, Typography, keyframes } from '@mui/material';
import { useBrandingAssets } from '../hooks/useBrandingAssets';

const logoIn = keyframes`
  0%   { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1);    opacity: 1; }
`;

/** The brand splash red — the same colour the native binary's splash
 * (app.json) and the boot spinner in index.html paint, so the hand-off from
 * the OS splash to this one is seamless. Brand, not theme: it never flips. */
const BRAND_SPLASH = '#F82C2E';

const fullBleedSx = {
  position: 'fixed',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
} as const;

/**
 * Boot splash on the brand red. The media comes from the admin Branding → mWeb
 * accordion: a full-bleed splash image or video when configured, otherwise the
 * brand logo from the same setting, centred — the same thing native's
 * SplashOverlay shows (rule 27).
 */
export default function SplashScreen() {
  const { appName, logoUrl, splashUrl, splashType } = useBrandingAssets();

  if (splashUrl) {
    return (
      <Box
        role="status"
        aria-label={`Loading ${appName}`}
        sx={{ position: 'fixed', inset: 0, zIndex: (t) => t.zIndex.modal + 100, bgcolor: BRAND_SPLASH }}
      >
        {splashType === 'VIDEO' ? (
          <Box component="video" src={splashUrl} autoPlay muted loop playsInline sx={fullBleedSx} />
        ) : (
          <Box component="img" src={splashUrl} alt={appName} sx={fullBleedSx} />
        )}
      </Box>
    );
  }

  return (
    <Box
      role="status"
      aria-label={`Loading ${appName}`}
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (t) => t.zIndex.modal + 100,
        display: 'grid',
        placeItems: 'center',
        bgcolor: BRAND_SPLASH,
        px: 3,
      }}
    >
      {logoUrl ? (
        <Box
          component="img"
          src={logoUrl}
          alt={appName}
          sx={{
            width: 'min(40vmin, 180px)',
            height: 'min(40vmin, 180px)',
            objectFit: 'contain',
            animation: `${logoIn} 600ms ease-out both`,
          }}
        />
      ) : (
        <Typography
          sx={{
            fontSize: 56,
            fontWeight: 600,
            color: '#fff',
            animation: `${logoIn} 600ms ease-out both`,
          }}
        >
          {appName}
        </Typography>
      )}
    </Box>
  );
}
