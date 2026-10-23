import { Text, XStack, YStack } from 'tamagui';
import {
  currentOfferTerms,
  formatMoney,
  venueOfferHistoryKey,
  venueOfferInboxModelKey,
  venueOfferInboxStatus,
  type OfferStatusTone,
} from '@duncit/utils';

import { BreakdownLines } from '@/components/venue-pricing/BreakdownLines';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingOffer } from '@/hooks/useVenueSlotRequests';

type Translate = ReturnType<typeof useTranslation>['t'];

const TONE_COLOR: Record<OfferStatusTone, string> = {
  warning: '$warning',
  info: '$primary',
  success: '$success',
  error: '$danger',
};

/** "Per guest · ₹300 per guest"; just the amount for an option this build does not know. */
export function offerTermsText(t: Translate, model: string, rate: number): string {
  const amount = formatMoney(rate);
  const keys = venueOfferInboxModelKey(model);
  if (!keys) return amount;
  return t('availability.offers.termsLine', {
    vars: { model: t(keys.label), rate: t(keys.rate, { vars: { rate: amount } }) },
  });
}

/**
 * A host's offer on a booking request: where it stands, the terms on the table
 * (the venue's counter while the host decides), what the venue receives and
 * what the host pays — the server's quote, line by line — and how it went.
 * The RN twin of the web OfferTermsPanel + OfferHistory (rule 27).
 */
export function OfferSummary({
  offer,
  podIsFree,
}: Readonly<{ offer: BookingOffer; podIsFree: boolean }>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const status = venueOfferInboxStatus(offer);
  const terms = currentOfferTerms(offer);
  const steps = offer.history.filter((entry) => venueOfferHistoryKey(entry));
  const booking = [
    t('availability.offers.guests', { vars: { n: offer.pax } }),
    offer.pets ? t('availability.offers.pets') : '',
    offer.space_label || t('availability.offers.wholeVenue'),
  ].filter(Boolean);

  return (
    <YStack gap={10} testID={`offer-summary-${offer.slot_id}`}>
      <Text fontSize={13} color="$muted">
        {booking.join(' · ')}
      </Text>
      <XStack gap={8} alignItems="center" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700" color="$color">
          {terms.by === 'VENUE'
            ? t('availability.offers.yourTerms')
            : t('availability.offers.hostTerms')}
        </Text>
        <Text fontSize={14} color="$color">
          {offerTermsText(t, terms.model, terms.rate)}
        </Text>
      </XStack>
      {status.key ? (
        <Text
          fontSize={12}
          fontWeight="600"
          color={TONE_COLOR[status.tone]}
          testID="offer-summary-status"
        >
          {t(status.key)}
        </Text>
      ) : null}
      {podIsFree ? null : (
        <YStack gap={8}>
          <Text fontSize={15} fontWeight="700" color="$success">
            {t('availability.offers.youReceive', {
              vars: { amount: formatMoney(terms.quote.venue_payout) },
            })}
          </Text>
          <Text fontSize={12} color="$muted">
            {t('availability.offers.hostPays', {
              vars: { amount: formatMoney(terms.quote.total) },
            })}
          </Text>
          <BreakdownLines breakdown={terms.quote} testID={`offer-summary-${offer.slot_id}-quote`} />
        </YStack>
      )}
      {steps.length > 0 ? (
        <YStack gap={4} testID="offer-summary-history">
          <Text fontSize={12} fontWeight="700" color="$muted">
            {t('availability.offers.history.title')}
          </Text>
          {steps.map((entry, index) => (
            <YStack key={`${entry.by}-${entry.action}-${entry.at ?? index}`} gap={2}>
              <Text fontSize={12} color="$color">
                {t(venueOfferHistoryKey(entry), {
                  vars: {
                    terms:
                      entry.model && entry.rate ? offerTermsText(t, entry.model, entry.rate) : '',
                  },
                })}
                {entry.at ? ` · ${fmt.formatDateTime(entry.at)}` : ''}
              </Text>
              {entry.note ? (
                <Text fontSize={12} color="$muted">
                  {t('availability.offers.history.note', { vars: { note: entry.note } })}
                </Text>
              ) : null}
            </YStack>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
