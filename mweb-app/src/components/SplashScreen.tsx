import { Box, Typography, keyframes } from '@mui/material';

const logoBounce = keyframes`
  0%   { transform: scale(0.6) translateY(-12px); opacity: 0; }
  40%  { transform: scale(1.08) translateY(0);    opacity: 1; }
  70%  { transform: scale(0.96); }
  100% { transform: scale(1);    opacity: 1; }
`;

const ripple = keyframes`
  0%   { transform: scale(0.4); opacity: 0.5; }
  80%  { opacity: 0; }
  100% { transform: scale(2.6); opacity: 0; }
`;

const fadeUp = keyframes`
  0%   { opacity: 0; transform: translateY(14px); }
  100% { opacity: 1; transform: translateY(0); }
`;

interface SplashProps {
  tagline?: string;
  description?: string;
  /** Brand logo shown on the splash — defaults to the Duncit wordmark. */
  logoUrl?: string;
}

/** Brand splash — the Duncit logo on the brand red (#F82C2E), matching the
 * native iOS/Android and web app icons. */
export default function SplashScreen({
  tagline = 'Welcome to Duncit',
  description = 'Find your tribe. Join pods, meet locals, share moments.',
  logoUrl = '/new-duncit-logo.png',
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
        bgcolor: '#F82C2E',
        background: 'radial-gradient(circle at 50% 38%, #ff5658 0%, #F82C2E 55%, #d81f21 100%)',
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
              borderColor: 'rgba(255,255,255,0.4)',
              animation: `${ripple} 2.6s ease-out ${delay}s infinite`,
            }}
          />
        ))}
        <Box
          component="img"
          src={logoUrl}
          alt="Duncit"
          sx={{
            position: 'relative',
            width: 188,
            height: 188,
            objectFit: 'contain',
            animation: `${logoBounce} 1.1s cubic-bezier(.2,.7,.2,1.4) both`,
            filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.25))',
          }}
        />
      </Box>

      <Typography
        variant="h5"
        sx={{
          mt: 5,
          fontWeight: 800,
          color: '#fff',
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
          color: 'rgba(255,255,255,0.88)',
          textAlign: 'center',
          opacity: 0,
          animation: `${fadeUp} 0.6s ease-out 0.75s forwards`,
        }}
      >
        {description}
      </Typography>
    </Box>
  );
}
