import { Box, keyframes } from '@mui/material';

interface Props {
  variant: 'processing' | 'success';
  size?: number;
}

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
`;

const drawCircle = keyframes`
  from { stroke-dashoffset: 166; }
  to { stroke-dashoffset: 0; }
`;

const drawCheck = keyframes`
  from { stroke-dashoffset: 48; }
  to { stroke-dashoffset: 0; }
`;

const popIn = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.05); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;

function ProcessingDots({ size }: { size: number }) {
  const dot = size * 0.18;
  return (
    <Box
      role="img"
      aria-label="Processing payment"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: `${dot * 0.55}px`,
        height: size * 0.4,
        width: size,
        mx: 'auto',
      }}
    >
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          sx={{
            width: dot,
            height: dot,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            animation: `${bounce} 1.2s infinite ease-in-out`,
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Box>
  );
}

function SuccessCheck({ size }: { size: number }) {
  return (
    <Box
      role="img"
      aria-label="Payment successful"
      sx={{
        width: size,
        height: size,
        mx: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: `${popIn} 480ms cubic-bezier(.2,.8,.2,1) both`,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 60 60"
        sx={{ width: '100%', height: '100%' }}
      >
        <Box
          component="circle"
          cx={30}
          cy={30}
          r={26}
          fill="none"
          stroke="#22c55e"
          strokeWidth={4}
          strokeLinecap="round"
          sx={{
            strokeDasharray: 166,
            strokeDashoffset: 166,
            transformOrigin: 'center',
            transform: 'rotate(-90deg)',
            animation: `${drawCircle} 600ms ease-out forwards`,
          }}
        />
        <Box
          component="path"
          d="M18 31 L27 40 L43 22"
          fill="none"
          stroke="#22c55e"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          sx={{
            strokeDasharray: 48,
            strokeDashoffset: 48,
            animation: `${drawCheck} 360ms 480ms ease-out forwards`,
          }}
        />
      </Box>
    </Box>
  );
}

export default function PaymentLottie({ variant, size = 120 }: Props) {
  return variant === 'success' ? (
    <SuccessCheck size={size} />
  ) : (
    <ProcessingDots size={size} />
  );
}
