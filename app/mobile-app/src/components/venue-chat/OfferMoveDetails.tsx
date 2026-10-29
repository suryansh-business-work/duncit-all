import { Text, XStack, YStack } from 'tamagui';
import { slotSpanLabel } from '@duncit/slots';
import { offerGuestsText, type VenueChatOfferMove } from '@duncit/utils';

import { OfferAnswerBy, OfferAsk } from '@/components/venue-offer/OfferAsk';
import { OfferImages } from '@/components/venue-offer/OfferImages';
import { OfferMoney } from '@/components/venue-offer/OfferMoney';
import {
  freeMoneyLine,
  offerTermsText,
  type OfferSide,
} from '@/components/venue-offer/offer-format';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

function Fact({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack gap={8} alignItems="baseline" flexWrap="wrap">
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
      <Text flexShrink={1} fontSize={13} color="$color">
        {value}
      </Text>
    </XStack>
  );
}

interface Props {
  move: VenueChatOfferMove;
  /** Who reads it: the venue reads "You receive …", a host what it costs the pod. */
  side: OfferSide;
  /** A free pod: the host settles the venue directly, so no money is shown. */
  podIsFree: boolean;
  /** Still waiting on an answer — the answer-by time shows. */
  open: boolean;
  /** Why the host asked for the venue free (`freeReasonNote`), as the venue reads it; '' for none. */
  freeNote?: string;
}

/**
 * The terms one move of the offer carried, as they stood: how the venue is
 * paid, for how many guests, when and where, pets, the money as a range (none
 * on a free pod or a free venue — the venue reads the host's reason instead),
 * what the venue is asked to provide, the note, any photos attached, why it was
 * declined, and until when it may be answered. mWeb twin: OfferMoveDetails.
 */
export function OfferMoveDetails({ move, side, podIsFree, open, freeNote = '' }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const guests = offerGuestsText(t, move.min_guests, move.max_guests);
  const when = slotSpanLabel(move.start_at, move.end_at, false, fmt, t('availability.wholeDay'));
  const freeLine = freeMoneyLine(t, side, podIsFree, move.model);
  const range = {
    venueMin: move.venue_receives_min,
    venueMax: move.venue_receives_max,
    totalMin: move.total_min,
    totalMax: move.total_max,
  };

  return (
    <YStack gap={6}>
      <Text testID="offer-move-terms" fontSize={14} fontWeight="700" color="$color">
        {offerTermsText(t, move.model, move.rate)}
      </Text>
      <Fact
        label={t('availability.offers.guestsLabel')}
        value={move.pets ? `${guests} · ${t('availability.offers.pets')}` : guests}
      />
      <Fact label={t('availability.offers.when')} value={when} />
      <Fact
        label={t('availability.offers.space')}
        value={move.space_label || t('availability.offers.wholeVenue')}
      />
      {freeNote ? (
        <Text testID="offer-move-free-reason" fontSize={13} fontWeight="600" color="$color">
          {freeNote}
        </Text>
      ) : null}
      {freeLine === null ? <OfferMoney side={side} range={range} /> : null}
      {freeLine ? (
        <Text testID="offer-move-free" fontSize={13} color="$muted">
          {freeLine}
        </Text>
      ) : null}
      <OfferAsk offerings={move.offerings} note={move.note} by={move.by} />
      <OfferImages images={move.images} testID={`offer-move-images-${move.round}`} />
      {move.event === 'DECLINED' && move.reason ? (
        <Text testID="offer-move-reason" fontSize={13} color="$muted">
          {t('availability.offers.chat.reason', { vars: { reason: move.reason } })}
        </Text>
      ) : null}
      {open ? <OfferAnswerBy at={move.expires_at} /> : null}
    </YStack>
  );
}
