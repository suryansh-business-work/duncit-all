import type { ReactNode } from 'react';
import { Box, keyframes } from '@mui/material';

const rise = keyframes`
  0% { opacity: 0; transform: translateY(12px); }
  100% { opacity: 1; transform: translateY(0); }
`;

interface Props {
  children: ReactNode;
  center?: boolean;
}

/**
 * The auth column: ~420px wide and centred, sitting straight on the flat auth
 * ground. Inputs and buttons are the theme's own (radius 14 surface fields,
 * green pill CTAs) — the frame only keeps the few touches every auth screen
 * shares, so login, signup and recovery cannot drift apart. Native twin:
 * components/AuthScaffold.
 */
export default function AuthScreenFrame({ children, center }: Readonly<Props>) {
  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        maxWidth: 420,
        px: 1,
        animation: `${rise} 0.4s cubic-bezier(.2,.7,.2,1) both`,
        display: center ? 'flex' : 'block',
        alignItems: center ? 'center' : undefined,
        '& .MuiOutlinedInput-root': { minHeight: 44 },
        '& .MuiInputAdornment-root .MuiSvgIcon-root': { color: 'text.secondary' },
        '& .MuiDivider-root': { color: 'text.secondary', fontSize: 12, fontWeight: 600 },
        '& .MuiLink-root': { color: 'primary.main', fontWeight: 600 },
      }}
    >
      <Box sx={{ width: '100%' }}>{children}</Box>
    </Box>
  );
}
