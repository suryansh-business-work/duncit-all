import { Text, XStack, YStack } from 'tamagui';
import {
  ticketDiscountRows,
  type TicketDiscountRow,
  type TicketDiscountSource,
} from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';

type TicketDiscountPod = TicketDiscountSource & { pod_amount: number };

/**
 * Whether the pod-details stack shows the multi-ticket offer: a paid pod whose
 * host switched the discount on with at least one tier.
 */
export function showsTicketDiscount(pod: TicketDiscountPod, isFree: boolean): boolean {
  if (isFree || !(pod.pod_amount > 0)) return false;
  return !!pod.ticket_discount_enabled && (pod.ticket_discount_tiers ?? []).length > 0;
}

/** One printed tier: how many tickets, what they take off, and a ticket's price then. */
function OfferRow({ row, currency }: Readonly<{ row: TicketDiscountRow; currency: string }>) {
  const { t } = useTranslation();
  const base = row.discount_pct === 0;
  const tickets = base
    ? t('mweb.podDetails.ticketDiscountBaseRow')
    : t('mweb.podDetails.ticketDiscountTierRow', { vars: { count: row.min_tickets } });
  const pct = base
    ? t('mweb.podDetails.ticketDiscountFullPrice')
    : t('mweb.podDetails.ticketDiscountPct', { vars: { pct: row.discount_pct } });
  return (
    <XStack
      testID={`pod-ticket-discount-row-${row.min_tickets}`}
      alignItems="center"
      justifyContent="space-between"
      gap={8}
    >
      <YStack flex={1}>
        <Text fontSize={13.5} fontWeight="700" color="$color">
          {tickets}
        </Text>
        <Text fontSize={11.5} color="$muted">
          {t('mweb.podDetails.ticketDiscountPerTicket', {
            vars: { price: formatMoney(currency, row.per_ticket) },
          })}
        </Text>
      </YStack>
      <Text fontSize={13.5} fontWeight="700" color={base ? '$muted' : '$success'}>
        {pct}
      </Text>
    </XStack>
  );
}

/**
 * The pod's multi-ticket offer on Pod Details: the full-price base row, then
 * every tier with what one ticket costs at it. mWeb twin (same test ids,
 * rule 27): the pod-details page's ticket discount section.
 */
export function PodTicketDiscountSection({
  pod,
  currency,
}: Readonly<{ pod: TicketDiscountPod; currency: string }>) {
  const { t } = useTranslation();
  const rows = ticketDiscountRows(pod.pod_amount, pod);
  return (
    <YStack testID="pod-ticket-discount-section" gap={10}>
      <Text fontSize={13.5} color="$muted">
        {t('mweb.podDetails.ticketDiscountIntro')}
      </Text>
      {rows.map((row) => (
        <OfferRow key={row.min_tickets} row={row} currency={currency} />
      ))}
    </YStack>
  );
}
