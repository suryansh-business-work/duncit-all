import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { formatStatementMoney, venueOfferInboxModelKey } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { PodRequestDetail } from '@/hooks/usePodRequestDetail';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type Slot = NonNullable<PodRequestDetail['slot']>;

interface Props {
  slot: Slot;
}

/** The proposal's price terms: the option and amount, the booking total and the venue's share. */
function ProposedTerms({ offer }: Readonly<{ offer: NonNullable<Slot['offer']> }>) {
  const { t } = useTranslation();
  const { currency } = usePublicFinance();
  const money = (value: number) => formatStatementMoney(value, currency);
  const keys = venueOfferInboxModelKey(offer.model);
  return (
    <YStack gap={2} testID="pod-request-proposed-terms">
      <Text fontSize={12} fontWeight="600" color="$muted">
        {t('windowOffer.proposedTerms')}
      </Text>
      {keys ? (
        <Text fontSize={14} fontWeight="600" color="$color">
          {t(keys.rate, { vars: { rate: money(offer.rate) } })}
        </Text>
      ) : null}
      <Text fontSize={13} color="$color">
        {t('windowOffer.bookingTotal', { vars: { amount: money(offer.quote.total) } })}
      </Text>
      <Text fontSize={13} color="$muted">
        {t('windowOffer.venueReceives', { vars: { amount: money(offer.quote.venue_payout) } })}
      </Text>
    </YStack>
  );
}

/** The time on the request — proposed by the receiver with its price, confirmed by the sender. */
export function SlotSummary({ slot }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { primary } = useThemeColors();
  const when = slot.whole_day
    ? [fmt.formatDate(slot.start_at), t('mweb.slots.wholeDay')].join(' · ')
    : [fmt.formatDateTime(slot.start_at), fmt.formatTime(slot.end_at)].join(' – ');

  return (
    <SurfaceCard testID="pod-request-slot">
      <XStack alignItems="center" gap={12}>
        <MaterialIcons name="event" size={22} color={primary} />
        <YStack flex={1} gap={2}>
          <Text fontSize={12} fontWeight="600" color="$muted">
            {t('podRequests.slotDetails')}
          </Text>
          <Text fontSize={15} fontWeight="600" color="$color">
            {when}
          </Text>
          <Text fontSize={13} color="$muted">
            {slot.space_label || t('mweb.slots.wholeVenue')}
          </Text>
        </YStack>
      </XStack>
      {slot.offer ? <ProposedTerms offer={slot.offer} /> : null}
    </SurfaceCard>
  );
}
