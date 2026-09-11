import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from '../../i18n/useTranslation';

/** The active payment-gateway badge — Razorpay when live, else Dummy when on.
 * Shared by the pod-membership and the standalone product checkout. */
export default function GatewayChip({ finance }: Readonly<{ finance: any }>) {
  const { t } = useTranslation();
  if (finance?.razorpay_enabled) {
    return (
      <Chip
        size="small"
        label={t('mweb.checkout.razorpay')}
        sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, 0.12), color: 'primary.main' })}
      />
    );
  }
  if (finance?.dummy_mode) {
    return (
      <Chip
        size="small"
        label={t('mweb.checkout.dummy')}
        sx={{ bgcolor: 'background.paper', color: 'text.primary' }}
      />
    );
  }
  return null;
}
