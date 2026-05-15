import { useEffect } from 'react';
import { Backdrop, Box } from '@mui/material';
import LottiePlayer from './LottiePlayer';

interface Props {
  open: boolean;
  onClose: () => void;
  lottieUrl?: string;
  durationMs?: number;
}

export default function ConfettiOverlay({
  open,
  onClose,
  lottieUrl = '/lotties/confetti.json',
  durationMs = 3500,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, durationMs);
    return () => clearTimeout(t);
  }, [open, durationMs, onClose]);

  return (
    <Backdrop
      open={open}
      onClick={onClose}
      sx={{
        zIndex: (t) => t.zIndex.modal + 200,
        bgcolor: 'transparent',
        pointerEvents: open ? 'auto' : 'none',
      }}
    >
      <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none' }}>
        <LottiePlayer src={lottieUrl} fallbackSrc="/lotties/confetti.json" loop={false} />
      </Box>
    </Backdrop>
  );
}
