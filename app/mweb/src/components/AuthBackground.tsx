import { Box, keyframes, useTheme } from '@mui/material';
import { auth } from '@duncit/auth-tokens';

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
interface Props {
  children: React.ReactNode;
}

/** Auth screens scroll inside this fixed frame, so the app-install bar (fixed to
 * the viewport) would cover their last rows without this extra bottom room. */
const BANNER_OFFSET = 'var(--duncit-app-banner-offset, 0px)';

export default function AuthBackground({ children }: Readonly<Props>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'safe center',
        py: { xs: 2, sm: 4 },
        pb: {
          xs: `calc(${theme.spacing(2)} + ${BANNER_OFFSET})`,
          sm: `calc(${theme.spacing(4)} + ${BANNER_OFFSET})`,
        },
        px: 2,
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        background: isDark
          ? `linear-gradient(120deg, ${auth.bgGradient.dark[0]} 0%, ${auth.bgGradient.dark[1]} 48%, ${auth.bgGradient.dark[2]} 100%)`
          : `linear-gradient(120deg, ${auth.bgGradient.light[0]} 0%, ${auth.bgGradient.light[1]} 46%, ${auth.bgGradient.light[2]} 100%)`,
        backgroundSize: '300% 300%',
        animation: `${gradientShift} 18s ease infinite`,
        '&:before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          background:
            isDark
              ? 'linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
              : 'linear-gradient(90deg, rgba(33,25,18,0.04) 1px, transparent 1px), linear-gradient(0deg, rgba(33,25,18,0.04) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          pointerEvents: 'none',
        },
      }}
    >
      {children}
    </Box>
  );
}
