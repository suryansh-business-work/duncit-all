import { Text, XStack, YStack } from 'tamagui';
import { currentOfferTerms, venueOfferInboxStatus, type OfferStatusTone } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { OfferAnswerBy, OfferAsk } from './OfferAsk';
import { OfferImages } from './OfferImages';
import { OfferQuoteView } from './OfferQuoteView';
import {
  freeMoneyLine,
  freeReasonNote,
  offerTermsText,
  type OfferSide,
  type OfferTerms,
} from './offer-format';

const TONE_COLOR: Readonly<Record<OfferStatusTone, string>> = {
  warning: '$warning',
  info: '$primary',
  success: '$success',
  error: '$danger',
};

/** Where the offer stands as the HOST is told (the venue reads `venueOfferInboxStatus`). */
const HOST_STATUS: Readonly<Record<string, { key: string; tone: OfferStatusTone }>> = {
  SENT: { key: 'availability.offers.hostAnswer.waiting', tone: 'info' },
  COUNTERED: { key: 'availability.offers.hostAnswer.yourMove', tone: 'warning' },
  ACCEPTED: { key: 'availability.offers.status.accepted', tone: 'success' },
  DECLINED: { key: 'availability.offers.status.declined', tone: 'error' },
};

/** Whose terms are on the table, as each side names them: [side][by]. */
const TERMS_HEADING: Readonly<Record<OfferSide, Record<OfferSide, string>>> = {
  HOST: {
    HOST: 'availability.offers.hostAnswer.yourTerms',
    VENUE: 'availability.offers.hostAnswer.venueTerms',
  },
  VENUE: { HOST: 'availability.offers.hostTerms', VENUE: 'availability.offers.yourTerms' },
};

const OPEN_STATUSES: ReadonlySet<string> = new Set(['SENT', 'COUNTERED']);

interface Props {
  offer: OfferTerms;
  /** A free pod: the host settles the venue's charges directly, so no amount is quoted. */
  podIsFree: boolean;
  /** Who reads it: the venue (its booking requests) or the pod's host (the pending screen). */
  side: OfferSide;
}

/**
 * The terms on the table — the host's offer, or the venue's counter while it
 * waits — with where the offer stands, the server's quote as a range from the
 * venue's minimum guests to the pod's spots (and its breakdown at the most),
 * what the venue is asked to provide, the note, the photos attached to those
 * terms, and the answer-by time while it is open. The venue and the host each
 * read it from their side. A free pod or a free venue shows no money
 * (`freeMoneyLine`); the venue reads why the host asked for the venue free.
 * mWeb twin: OfferTermsPanel.
 */
export function OfferTermsPanel({ offer, podIsFree, side }: Readonly<Props>) {
  const { t } = useTranslation();
  const terms = currentOfferTerms(offer);
  const status = side === 'HOST' ? HOST_STATUS[offer.status] : venueOfferInboxStatus(offer);
  const freeLine = freeMoneyLine(t, side, podIsFree, terms.model);
  const freeNote = side === 'VENUE' ? freeReasonNote(t, offer.free_justification) : '';

  return (
    <YStack gap={10} testID={`offer-terms-${offer.slot_id}`}>
      <XStack gap={8} alignItems="center" flexWrap="wrap">
        <Text fontSize={14} fontWeight="700" color="$color">
          {t(TERMS_HEADING[side][terms.by])}
        </Text>
        <Text testID="offer-terms-line" fontSize={14} color="$color">
          {offerTermsText(t, terms.model, terms.rate)}
        </Text>
      </XStack>
      {status?.key ? (
        <Text testID="offer-status" fontSize={12} fontWeight="600" color={TONE_COLOR[status.tone]}>
          {t(status.key)}
        </Text>
      ) : null}
      {freeNote ? (
        <Text testID="offer-free-reason" fontSize={13} fontWeight="600" color="$color">
          {freeNote}
        </Text>
      ) : null}
      {freeLine === null ? (
        <OfferQuoteView
          side={side}
          quote={terms.quote}
          quoteMin={terms.quoteMin}
          testID={`offer-terms-${offer.slot_id}-quote`}
        />
      ) : null}
      {freeLine ? (
        <Text
          testID={podIsFree ? 'offer-free-pod' : 'offer-free-venue'}
          fontSize={13}
          color="$muted"
        >
          {freeLine}
        </Text>
      ) : null}
      <OfferAsk offerings={terms.offerings} note={terms.note} by={terms.by} />
      <OfferImages
        images={offer.counter ? offer.counter.images : offer.images}
        testID={`offer-terms-${offer.slot_id}-images`}
      />
      {OPEN_STATUSES.has(offer.status) ? <OfferAnswerBy at={offer.expires_at} /> : null}
    </YStack>
  );
}
