import { Box, Typography, keyframes } from '@mui/material';

const logoBounce = keyframes`
  0%   { transform: scale(0.6) translateY(-12px); opacity: 0; }
  40%  { transform: scale(1.08) translateY(0);    opacity: 1; }
  70%  { transform: scale(0.96); }
  100% { transform: scale(1);    opacity: 1; }
`;

const ripple = keyframes`
  0%   { transform: scale(0.4); opacity: 0.55; }
  80%  { opacity: 0; }
  100% { transform: scale(2.6); opacity: 0; }
`;

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const arrowFloat = keyframes`
  0%, 100% { transform: translateX(0); }
  50%      { transform: translateX(6px); }
`;

interface SplashProps {
  tagline?: string;
  description?: string;
}

export default function SplashScreen({
  tagline = 'Welcome to Duncit',
  description = 'Find your tribe. Join pods, meet locals, share moments.',
}: SplashProps) {
  return (
    <Box
      role="status"
      aria-label="Loading Duncit"
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (t) => t.zIndex.modal + 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#fff',
        background:
          'radial-gradient(circle at 50% 38%, #fff 0%, #fff5f5 55%, #ffe9ea 100%)',
        px: 3,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          width: 220,
          height: 220,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {[0, 0.6, 1.2].map((delay) => (
          <Box
            key={delay}
            sx={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: '1.5px solid',
              borderColor: 'rgba(255,77,79,0.35)',
              animation: `${ripple} 2.6s ease-out ${delay}s infinite`,
            }}
          />
        ))}
        <Box
          component="img"
          src="/duncit-logo.svg"
          alt="Duncit"
          sx={{
            position: 'relative',
            width: 168,
            height: 'auto',
            objectFit: 'contain',
            animation: `${logoBounce} 1.1s cubic-bezier(.2,.7,.2,1.4) both`,
            filter: 'drop-shadow(0 8px 18px rgba(255,77,79,0.25))',
          }}
        />
      </Box>

      <Typography
        variant="h5"
        sx={{
          mt: 5,
          fontWeight: 800,
          color: '#0F1419',
          textAlign: 'center',
          opacity: 0,
          animation: `${fadeUp} 0.6s ease-out 0.5s forwards`,
        }}
      >
        {tagline}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          mt: 1,
          maxWidth: 320,
          color: 'text.secondary',
          textAlign: 'center',
          opacity: 0,
          animation: `${fadeUp} 0.6s ease-out 0.75s forwards`,
        }}
      >
        {description}
      </Typography>

      <Box
        aria-hidden
        sx={{
          mt: 5,
          width: 44,
          height: 44,
          borderRadius: '50%',
          bgcolor: '#0F1419',
          color: '#fff',
          display: 'grid',
          placeItems: 'center',
          fontSize: 20,
          opacity: 0,
          animation: `${fadeUp} 0.6s ease-out 1s forwards, ${arrowFloat} 1.4s ease-in-out 1.6s infinite`,
        }}
      >
        →
      </Box>
    </Box>
  );
}
