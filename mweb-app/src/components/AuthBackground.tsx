import { Box, keyframes } from '@mui/material';

const gradientShift = keyframes`
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;
const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50%      { transform: translateY(-12px) rotate(2deg); }
`;

interface Props {
  children: React.ReactNode;
}

/**
 * Animated gradient + floating-blob backdrop used by the auth pages.
 * Extracted into its own component so the page files stay focused on
 * form orchestration and remain under the 200-line cap.
 */
export default function AuthBackground({ children }: Props) {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        p: 2,
        overflow: 'hidden',
        background:
          'linear-gradient(120deg, #ffe1e2 0%, #fff 30%, #ffd6d8 65%, #fff0c4 100%)',
        backgroundSize: '300% 300%',
        animation: `${gradientShift} 18s ease infinite`,
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          top: '-80px',
          left: '-60px',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, rgba(255,77,79,0.25), transparent 70%)',
          animation: `${float} 7s ease-in-out infinite`,
        }}
      />
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: '-90px',
          right: '-50px',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 60% 40%, rgba(255,200,80,0.28), transparent 70%)',
          animation: `${float} 9s ease-in-out infinite reverse`,
        }}
      />
      {children}
    </Box>
  );
}
