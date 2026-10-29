import { Text, XStack, YStack } from 'tamagui';
import {
  buildVenueBillLines,
  formatMoney,
  mwebVenueBillLabels,
  venueOfferTermsLine,
} from '@duncit/utils';

import type { PodSettlement } from '@/hooks/useSettlementPreview';
import { useTranslation } from '@/hooks/useTranslation';
import { VenueBillSummary } from './VenueBillSummary';

type Translate = ReturnType<typeof useTranslation>['t'];

/**
 * "Per guest · ₹300.00 per guest", "Free venue" — the agreed terms in the words
 * the venue's own booking requests use (`availability.*`, shipped by both
 * apps); just the formatted rate for an option this build does not know. mWeb
 * twin: @duncit/host-pod-actions labels' agreedTerms.
 */
export function agreedTermsText(t: Translate, model: string, rate: string): string {
  return venueOfferTermsLine(t, model, rate);
}

/**
 * What the venue's side comes to, above the split that takes it off the pool:
 * the terms agreed with the venue, then who came, the guests a per-guest
 * booking is paid for (never fewer than its minimum), the agreed amount, the
 * bill uploaded as its proof, any extra charges and the venue total.
 *
 * Every figure is the settlement's — nothing here adds two numbers together.
 * mWeb twin: @duncit/host-pod-actions VenueSettlementSummary.
 */
export function VenueSettlementSummary({ settlement }: Readonly<{ settlement: PodSettlement }>) {
  const { t } = useTranslation();
  const symbol = settlement.currency_symbol;
  const model = settlement.venue_agreed_model;
  const rate = settlement.venue_agreed_rate;
  const lines = buildVenueBillLines(
    {
      slot_price: settlement.venue_slot_price,
      bill: settlement.venue_bill,
      slot_included: settlement.include_slot_price,
      venue_amount: settlement.waterfall.venue_amount,
      attended_seats: settlement.attended_seats,
      booked_seats: settlement.booked_seats,
      extra: settlement.venue_extra_amount,
      min_guests: settlement.venue_min_guests,
      // The guests the server priced the booking for: the people who came (or
      // the count entered), never below the agreed minimum.
      people_counted: settlement.venue_pax,
    },
    mwebVenueBillLabels(t),
    symbol,
  );

  return (
    <YStack gap={4}>
      {/* A booking made before offers has no agreed terms to state. */}
      {model && rate != null ? (
        <XStack gap={12} justifyContent="space-between" testID="settlement-agreed-terms">
          <Text flex={1} fontSize={13} color="$color">
            {t('availability.offers.agreedTerms')}
          </Text>
          <Text fontSize={13} color="$color" textAlign="right">
            {agreedTermsText(t, model, formatMoney(rate, { symbol, decimals: 2, grouping: false }))}
          </Text>
        </XStack>
      ) : null}
      <VenueBillSummary lines={lines} />
    </YStack>
  );
}
