import { Stack } from '@mui/material';
import { InfoRow } from '@duncit/ui';
import { ticketDiscountRows, type TicketDiscountSource } from '@duncit/utils';
import { useTranslation } from './i18n/useTranslation';

/** The pod fields the offer row reads off POD_DETAIL. */
export interface PodTicketDiscountFields extends TicketDiscountSource {
  pod_type?: string | null;
  pod_amount?: number | null;
}

/**
 * The pod's LIVE multi-ticket offer, one line per tier ("4+ tickets · 20% off").
 *
 * Nothing renders for a free pod, a pod without the offer, or one with no tiers:
 * a free ticket has no price to discount, and the server clears the tiers there.
 * What a past booking actually got is frozen on its payment — the payments table
 * reads that, never this.
 */
export default function PodTicketDiscountRow({ pod }: Readonly<{ pod: PodTicketDiscountFields }>) {
  const { t } = useTranslation();
  const unitPrice = Number(pod.pod_amount) || 0;
  const free = (pod.pod_type ?? '').includes('FREE') || unitPrice <= 0;
  // The shared rows lead with the fixed "1 ticket · 0%" base row, which is never stored.
  const tiers = free ? [] : ticketDiscountRows(unitPrice, pod).slice(1);
  if (tiers.length === 0) return null;

  return (
    <InfoRow
      variant="split"
      label={t('podDetailsPanel.podOverviewCard.ticketDiscount')}
      sx={{ py: 0.75 }}
      value={
        <Stack spacing={0.25}>
          {tiers.map((tier) => (
            // min_tickets is strictly increasing across tiers, so it is a unique key.
            <span key={tier.min_tickets}>
              {t('podDetailsPanel.podOverviewCard.ticketDiscountTier', {
                vars: { count: tier.min_tickets, pct: tier.discount_pct },
              })}
            </span>
          ))}
        </Stack>
      }
    />
  );
}
