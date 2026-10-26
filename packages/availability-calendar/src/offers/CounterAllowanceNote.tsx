import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { offerCounterAllowance, type OfferCounterUsage } from '@duncit/utils';
import type { OfferSide } from './offer-target';

/**
 * How many counters the reader's side has left of its share (Pod Settings) —
 * or, once none are, that only accepting or rejecting is left. Nothing when the
 * server names no limit.
 */
export default function CounterAllowanceNote({ offer, side }: Readonly<{ offer: OfferCounterUsage; side: OfferSide }>) {
  const { t } = useTranslation();
  const allowance = offerCounterAllowance(offer, side);
  if (!allowance) return null;
  return (
    <Typography
      variant="caption"
      component="p"
      data-testid={`counter-allowance-${side.toLowerCase()}`}
      sx={{ color: allowance.left === 0 ? 'warning.main' : 'text.secondary', fontWeight: 700, textAlign: 'right', m: 0 }}
    >
      {allowance.left === 0
        ? t('availability.offers.noCountersLeft')
        : t('availability.offers.countersLeft', { vars: { left: allowance.left, of: allowance.of } })}
    </Typography>
  );
}
