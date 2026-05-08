import Lottie from 'lottie-react';
import { Box } from '@mui/material';
import { PAYMENT_PROCESSING_LOTTIE, PAYMENT_SUCCESS_LOTTIE } from '../assets/paymentLottie';

interface Props {
  variant: 'processing' | 'success';
  size?: number;
}

export default function PaymentLottie({ variant, size = 120 }: Props) {
  const data = variant === 'success' ? PAYMENT_SUCCESS_LOTTIE : PAYMENT_PROCESSING_LOTTIE;
  return (
    <Box
      role="img"
      aria-label={variant === 'success' ? 'Payment successful' : 'Processing payment'}
      sx={{ width: size, height: variant === 'success' ? size : size * 0.4, mx: 'auto' }}
    >
      <Lottie
        animationData={data}
        loop={variant === 'processing'}
        autoplay
        style={{ width: '100%', height: '100%' }}
      />
    </Box>
  );
}
