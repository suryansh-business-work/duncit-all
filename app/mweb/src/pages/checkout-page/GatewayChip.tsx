import { Chip } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

/** The active payment-gateway badge — Razorpay when live, else Dummy when on.
 * Shared by the pod-membership and the standalone product checkout. */
export default function GatewayChip({ finance }: Readonly<{ finance: any }>) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  if (finance?.razorpay_enabled) {
    return (
      <Chip
        size="small"
        label="Razorpay"
        sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.14)' : alpha(theme.palette.primary.main, 0.12), color: 'text.primary', fontWeight: 800 }}
      />
    );
  }
  if (finance?.dummy_mode) {
    return (
      <Chip
        size="small"
        label="Dummy"
        sx={{ bgcolor: isDark ? 'rgba(255,255,255,0.14)' : alpha(theme.palette.text.primary, 0.08), color: 'text.primary', fontWeight: 800 }}
      />
    );
  }
  return null;
}
