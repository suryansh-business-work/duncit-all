import type { ReactNode } from 'react';
import { Box, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import { tokens, useColorMode } from '@duncit/theme';
import { useBranding } from '../hooks/useBranding';

const Shell = styled(Box)(({ theme }) => ({
  minHeight: '100dvh',
  width: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr',
  background: theme.palette.background.default,
  [theme.breakpoints.up('md')]: { gridTemplateColumns: '40% 60%' },
}));

const FormPane = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4, 3),
  [theme.breakpoints.up('sm')]: { padding: theme.spacing(6, 5) },
}));

const FormInner = styled(Box)({ width: '100%', maxWidth: 420 });

const TopRight = styled(Box)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  display: 'flex',
  gap: theme.spacing(1),
}));

const ImagePane = styled(Box)<{ image: string }>(({ theme, image }) => ({
  position: 'relative',
  display: 'none',
  backgroundImage: `url("${image}")`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  [theme.breakpoints.up('md')]: { display: 'block' },
}));

const ImageOverlay = styled(Box)(({ theme }) => {
  const isDark = theme.palette.mode === 'dark';
  const black = theme.palette.common.black;
  return {
    position: 'absolute',
    inset: 0,
    padding: theme.spacing(5),
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: isDark
      ? `linear-gradient(180deg, ${alpha(black, 0.55)} 0%, ${alpha(black, 0.78)} 100%)`
      : `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.45)} 0%, ${alpha(black, 0.62)} 100%)`,
    color: theme.palette.common.white,
  };
});

export interface AuthSplitLayoutProps {
  title: string;
  subtitle?: string;
  /** Portal chip label, e.g. `Finance Portal`. */
  portalLabel: string;
  /** Human console title shown over the promo image. */
  fullName: string;
  /** Promo line shown under the console title. */
  tagline: string;
  /** Background image of the right-hand promo pane. */
  loginImage: string;
  children: ReactNode;
}

/** The shared split login/auth layout: form pane + branded promo image pane. */
export function AuthSplitLayout({
  title,
  subtitle,
  portalLabel,
  fullName,
  tagline,
  loginImage,
  children,
}: Readonly<AuthSplitLayoutProps>) {
  const { mode, toggle } = useColorMode();
  const { logoUrl, appName } = useBranding();
  return (
    <Shell>
      <FormPane>
        <TopRight>
          <Tooltip title={mode === 'dark' ? 'Switch to light' : 'Switch to dark'}>
            <IconButton onClick={toggle} aria-label="toggle color mode" size="small">
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </TopRight>
        <FormInner>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ display: { xs: 'flex', md: 'none' }, mb: 3 }}
          >
            <Box
              component="img"
              src={logoUrl}
              alt={appName}
              sx={{ height: 32, width: 'auto', objectFit: 'contain' }}
            />
            <Chip
              label={portalLabel}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700, letterSpacing: 0.3 }}
            />
          </Stack>
          <Stack spacing={0.75} sx={{ mb: 3 }}>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Stack>
          {children}
        </FormInner>
      </FormPane>

      <ImagePane image={loginImage}>
        <ImageOverlay>
          <Stack alignItems="center" spacing={1.5} sx={{ mt: { md: 6, lg: 8 } }}>
            <Box
              component="img"
              src={logoUrl}
              alt={appName}
              sx={{
                height: 64,
                width: 'auto',
                maxWidth: 220,
                objectFit: 'contain',
                filter: `drop-shadow(0 6px 18px ${alpha(tokens.common.black, 0.45)})`,
              }}
            />
            <Chip
              label={portalLabel}
              sx={{
                bgcolor: alpha(tokens.common.white, 0.12),
                color: tokens.common.white,
                border: `1px solid ${alpha(tokens.common.white, 0.28)}`,
                fontWeight: 700,
                letterSpacing: 0.4,
                backdropFilter: 'blur(6px)',
              }}
            />
          </Stack>
          <Box sx={{ mt: 'auto', textAlign: 'center', maxWidth: 520, mx: 'auto' }}>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, mb: 1, textShadow: `0 2px 12px ${alpha(tokens.common.black, 0.45)}` }}
            >
              {fullName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.92, textShadow: `0 2px 10px ${alpha(tokens.common.black, 0.45)}` }}>
              {tagline}
            </Typography>
          </Box>
        </ImageOverlay>
      </ImagePane>
    </Shell>
  );
}
