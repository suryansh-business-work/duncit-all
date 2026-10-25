import { Alert, Stack, Typography } from '@mui/material';
import { moneyRangeText } from '@duncit/utils';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { EarningsProjection } from './queries';

interface Props {
  projection: EarningsProjection;
  money: (rupees: number) => string;
}

/**
 * The host's take-home as a range when the pod books a venue offer that is
 * paid for at least the venue's minimum guests: from that minimum (tickets for
 * that many, the venue's cost at its minimum taken off) up to every spot sold.
 * Both ends are the server's own projections (`potentialPodEarnings` and its
 * `minimum`). A low end at or below ₹0 is said, never blocked — the server only
 * refuses a pod that earns nothing at all its spots. Native twin: EarningsRange.
 */
export default function EarningsRange({ projection, money }: Readonly<Props>) {
  const { t } = useTranslation();
  const { minimum } = projection;
  if (!minimum) return null;
  const atFewest = minimum.waterfall.host_receives;
  const atMost = projection.waterfall.host_receives;
  return (
    <Stack spacing={0.5} data-testid="price-panel-earnings-range" aria-live="polite">
      <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {t('mweb.createPod.earningsRange.title')}
        </Typography>
        <Typography
          variant="body2"
          data-testid="price-panel-earnings-range-value"
          sx={{ fontWeight: 700, color: 'success.main', whiteSpace: 'nowrap' }}
        >
          {moneyRangeText(Math.min(atFewest, atMost), Math.max(atFewest, atMost), money)}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('mweb.createPod.earningsRange.hint', { vars: { min: minimum.total_spots, max: projection.total_spots } })}
      </Typography>
      {atFewest <= 0 && (
        <Alert severity="warning" data-testid="price-panel-earnings-range-low" sx={{ py: 0.25 }}>
          {t('mweb.createPod.earningsRange.lowWarning', { vars: { min: minimum.total_spots } })}
        </Alert>
      )}
    </Stack>
  );
}
