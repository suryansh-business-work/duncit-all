import type { ReactNode } from 'react';
import { Box, keyframes } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

const rise = keyframes`
  0% { opacity: 0; transform: translateY(22px) scale(0.98); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

interface Props {
  children: ReactNode;
  center?: boolean;
}

export default function AuthScreenFrame({ children, center }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: center ? 480 : 760,
        px: { xs: 1.5, sm: 2 },
        animation: `${rise} 0.55s cubic-bezier(.2,.7,.2,1) both`,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          borderRadius: { xs: 3, sm: 4 },
          overflow: 'visible',
          p: { xs: 2.25, sm: center ? 4 : 3.5 },
          bgcolor: isDark ? alpha('#14111f', 0.94) : alpha('#ffffff', 0.96),
          background:
            isDark
              ? 'linear-gradient(150deg, rgba(44,28,74,0.96) 0%, rgba(20,17,31,0.98) 48%, rgba(48,22,30,0.94) 100%)'
              : 'linear-gradient(150deg, rgba(255,255,255,0.98) 0%, rgba(255,246,247,0.96) 52%, rgba(255,236,239,0.94) 100%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(20,17,31,0.08)',
          boxShadow: isDark
            ? '0 28px 90px rgba(0,0,0,0.48)'
            : '0 24px 70px rgba(96,56,52,0.16)',
          '&:before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            background:
              isDark
                ? 'linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(0deg, rgba(255,255,255,0.025) 1px, transparent 1px)'
                : 'linear-gradient(90deg, rgba(38,24,20,0.035) 1px, transparent 1px), linear-gradient(0deg, rgba(38,24,20,0.035) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            borderRadius: 'inherit',
            opacity: 0.5,
            pointerEvents: 'none',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: center ? 'flex' : 'block',
            alignItems: center ? 'center' : undefined,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.72)',
              minHeight: 46,
              '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.13)' : 'rgba(31,27,46,0.14)' },
              '&:hover fieldset': { borderColor: alpha(theme.palette.primary.main, 0.55) },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main, borderWidth: 2 },
            },
            '& .MuiInputBase-input': { color: 'text.primary', fontWeight: 700, py: 1.05 },
            '& .MuiInputAdornment-root, & .MuiSvgIcon-root': { color: 'text.secondary' },
            '& .MuiInputLabel-root': {
              color: 'text.secondary',
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
            },
            '& .MuiInputLabel-root.Mui-focused': { color: 'primary.main' },
            '& .MuiFormHelperText-root': { minHeight: 10, mx: 0.25, mt: 0.25, fontSize: 10 },
            '& .MuiButton-contained': {
              minHeight: 48,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #ff535e 0%, #f23da6 100%)',
              boxShadow: '0 18px 36px rgba(255,76,103,0.34)',
            },
            '& .MuiDivider-root': { color: 'text.secondary', fontSize: 12 },
            '& .MuiDivider-root:before, & .MuiDivider-root:after': { borderColor: 'divider' },
            '& .MuiLink-root': { color: 'primary.main', fontWeight: 800 },
          }}
        >
          <Box sx={{ width: '100%' }}>{children}</Box>
        </Box>
      </Box>
    </Box>
  );
}