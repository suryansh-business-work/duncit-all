import { Box, keyframes, useTheme } from '@mui/material';

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
interface Props {
  children: React.ReactNode;
}

export default function AuthBackground({ children }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        p: 2,
        overflowY: 'auto',
        background:
          isDark
            ? 'linear-gradient(120deg, #100f18 0%, #191326 48%, #25151d 100%)'
            : 'linear-gradient(120deg, #f7f2ea 0%, #fffaf4 46%, #f5e6e8 100%)',
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
