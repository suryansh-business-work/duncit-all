import { Spinner, Text, YStack } from 'tamagui';
import {
  buildEarningsSplit,
  buildVenueBillLines,
  formatStatementMoney,
  mwebVenueBillLabels,
} from '@duncit/utils';

import { EarningsSplitAccordion } from '@/components/create-pod/price-panel/EarningsSplitAccordion';
import type { PodSettlement } from '@/hooks/useSettlementPreview';
import { useTranslation } from '@/hooks/useTranslation';
import { VenueBillSummary } from './VenueBillSummary';

interface Props {
  settlement: PodSettlement | null;
  isLoading: boolean;
  /** The pod is FREE: there is no payout to preview. The settlement's own
   * `is_free` says the same once it has loaded. */
  free?: boolean;
}

/** "Host Share" preview: the pod's money split four ways for the entered venue
 * bill, the host's earning first. A free pod shows no figure at all — just
 * "Free pod" and why (mWeb twin: @duncit/host-pod-actions' SettlementPreview). */
export function SettlementSummary({ settlement, isLoading, free = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const isFree = free || !!settlement?.is_free;
  let body;
  if (settlement && isFree) {
    body = (
      <Text testID="settlement-free-note" fontSize={12} color="$muted">
        {t('mweb.hostShare.freeNote')}
      </Text>
    );
  } else if (settlement) {
    const symbol = settlement.currency_symbol;
    // The same four-way split as Create Pod and every portal, the host's own
    // earning first. Where the release pays less than the engine's host figure
    // (an expired window, or a host side below zero) the notes below say so.
    const split = buildEarningsSplit(settlement.waterfall, { symbol, t, viewer: 'host' });
    body = (
      <YStack gap={4}>
        {/* The head count these figures come from. A completed pod settles on
            what it actually collected, so this is real attendance, not the
            spots the host planned for — and their own seat was free. mWeb twin. */}
        <Text testID="settlement-attendees" fontSize={12} color="$muted">
          Based on {settlement.paying_attendees} paying{' '}
          {settlement.paying_attendees === 1 ? 'attendee' : 'attendees'} — your own spot is free.
        </Text>
        {/* What the venue's side comes to: the earlier slot price, the bill
            entered above and the total the split below takes off the pool. */}
        {settlement.has_venue ? (
          <VenueBillSummary
            lines={buildVenueBillLines(
              {
                slot_price: settlement.venue_slot_price,
                bill: settlement.venue_bill,
                slot_included: settlement.include_slot_price,
                venue_amount: settlement.waterfall.venue_amount,
                attended_seats: settlement.attended_seats,
                booked_seats: settlement.booked_seats,
              },
              mwebVenueBillLabels(t),
              symbol,
            )}
          />
        ) : null}
        <EarningsSplitAccordion
          split={split}
          money={(value) => formatStatementMoney(value, symbol)}
          venueShortfall={false}
        />
        {settlement.complete_expired ? (
          <Text testID="settlement-expired" fontSize={12} color="$danger">
            {t('mweb.hostShare.expired')}
          </Text>
        ) : null}
        {settlement.waterfall.host_receives < 0 ? (
          <Text testID="settlement-shortfall" fontSize={12} color="$danger">
            {t('mweb.hostShare.shortfall')}
          </Text>
        ) : null}
      </YStack>
    );
  } else {
    body = isLoading ? (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        testID="settlement-loading"
        size="small"
        color="$primary"
      />
    ) : (
      <Text testID="settlement-empty" fontSize={12} color="$muted">
        {t('mweb.hostShare.previewHint')}
      </Text>
    );
  }

  return (
    <YStack
      gap={6}
      padding={14}
      borderRadius={16}
      backgroundColor="$primarySoft"
      testID="settlement-summary"
    >
      <Text
        testID={isFree ? 'settlement-free' : undefined}
        fontSize={14}
        fontWeight="600"
        color="$color"
      >
        {isFree ? t('mweb.hostShare.freePod') : t('mweb.hostShare.title')}
      </Text>
      {body}
    </YStack>
  );
}
