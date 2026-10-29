import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { isFreeArrangement, offerCounterAllowance, type OfferCounterUsage } from '@duncit/utils';
import type { OfferSide } from './offer-target';

/** What the note reads: the counters' usage, and whether the booking is free (a free venue or a free pod). */
export interface CounterAllowanceSource extends OfferCounterUsage {
  model?: string | null;
  free_pod?: boolean | null;
}

/**
 * How many counters the reader's side has left of its share (Pod Settings) —
 * or, once none are, that only accepting or rejecting is left. A free booking
 * takes no counters at all, so it says that instead of "used all your
 * counters". Nothing when the server names no limit.
 */
export default function CounterAllowanceNote({ offer, side }: Readonly<{ offer: CounterAllowanceSource; side: OfferSide }>) {
  const { t } = useTranslation();
  const testId = `counter-allowance-${side.toLowerCase()}`;
  const sx = { fontWeight: 700, textAlign: 'right', m: 0 } as const;
  if (isFreeArrangement(offer)) {
    return (
      <Typography variant="caption" component="p" data-testid={testId} sx={{ ...sx, color: 'text.secondary' }}>
        {t('availability.offers.freeNoCounters')}
      </Typography>
    );
  }
  const allowance = offerCounterAllowance(offer, side);
  if (!allowance) return null;
  return (
    <Typography variant="caption" component="p" data-testid={testId} sx={{ ...sx, color: allowance.left === 0 ? 'warning.main' : 'text.secondary' }}>
      {allowance.left === 0
        ? t('availability.offers.noCountersLeft')
        : t('availability.offers.countersLeft', { vars: { left: allowance.left, of: allowance.of } })}
    </Typography>
  );
}
