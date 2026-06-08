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
        px: { xs: 2, sm: 2 },
        animation: `${rise} 0.55s cubic-bezier(.2,.7,.2,1) both`,
      }}
    >
      {/* No card/box: the form sits directly on the full-screen auth gradient. */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          p: { xs: 0.5, sm: 1 },
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