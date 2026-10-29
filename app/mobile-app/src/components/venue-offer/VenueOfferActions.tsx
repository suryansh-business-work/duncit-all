import { useState } from 'react';
import { slotSpanLabel } from '@duncit/slots';
import {
  currentOfferTerms,
  isFreeArrangement,
  offerCounterAllowance,
  offerQuoteRange,
  venueOfferActions,
} from '@duncit/utils';

import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { VenueOfferAnswers } from '@/hooks/useVenueOfferAnswers';
import { fireAndForget } from '@/utils/fire-and-forget';
import { offerAnswerCopy, type AnswerChoice } from './answer-copy';
import { OfferActionButtons } from './OfferActionButtons';
import { OfferAnswerSheet } from './OfferAnswerSheet';
import { offerMoney, offerMoneyRange, type OfferTerms } from './offer-format';

/** The booking an answer is about, as the accept names it. */
export interface VenueOfferSubject {
  pod_title: string;
  venue_name: string;
  start_at: string;
  end_at: string;
  whole_day?: boolean | null;
  /** A free pod settles the venue off the platform: no amount is named. */
  pod_is_free: boolean;
  /** A request from before offers is answered at its slot price. */
  price: number;
}

interface Props {
  slotId: string;
  /** The host's offer; null for a request from before offers (accept or reject only). */
  offer?: OfferTerms | null;
  subject: VenueOfferSubject;
  answers: VenueOfferAnswers;
  testIDPrefix: string;
}

const LEGACY_ACTIONS = { accept: true, reject: true, counter: false };

/** What the venue receives if it accepts: the terms on the table, from the fewest guests to the most. */
function payoutText(subject: VenueOfferSubject, offer?: OfferTerms | null): string {
  if (!offer) return offerMoney(subject.price);
  const terms = currentOfferTerms(offer);
  const range = offerQuoteRange(terms.quote, terms.quoteMin);
  return offerMoneyRange(range.venueMin, range.venueMax);
}

/** What the venue may do: a free venue or a free pod is accepted or declined, never countered. */
function actionsFor(offer: OfferTerms | null | undefined, free: boolean) {
  if (!offer) return LEGACY_ACTIONS;
  const open = venueOfferActions(offer);
  return { ...open, counter: open.counter && !free };
}

/**
 * What the venue can do with a booking right now — Accept, Counter or Reject a
 * fresh offer; change or withdraw its counter while the host decides — from its
 * booking requests and from the pod's venue chat. A free booking (a free venue
 * or a free pod) is only accepted or declined, and its accept names no amount.
 * Each opens its own sheet and answers the round it read. mWeb twin:
 * OfferDecisionActions.
 */
export function VenueOfferActions({
  slotId,
  offer,
  subject,
  answers,
  testIDPrefix,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [choice, setChoice] = useState<AnswerChoice | null>(null);
  const [countering, setCountering] = useState(false);
  const round = offer ? offer.round : null;
  const free = subject.pod_is_free || isFreeArrangement(offer);
  const close = () => {
    answers.clearError();
    setChoice(null);
    setCountering(false);
  };
  // A sheet closes once its answer went through (or the host moved first).
  const settle = (answered: Promise<boolean>) =>
    fireAndForget(answered.then((done) => done && close()));
  const confirm = (reason: string) =>
    settle(
      choice === 'accept' ? answers.accept(slotId, round) : answers.reject(slotId, reason, round),
    );
  const when = slotSpanLabel(
    subject.start_at,
    subject.end_at,
    !!subject.whole_day,
    fmt,
    t('availability.wholeDay'),
  );
  const vars = {
    pod: subject.pod_title,
    venue: subject.venue_name,
    when,
    amount: payoutText(subject, offer),
  };

  return (
    <>
      <OfferActionButtons
        testIDPrefix={testIDPrefix}
        actions={actionsFor(offer, free)}
        allowance={offer ? offerCounterAllowance(offer, 'VENUE') : null}
        free={!!offer && free}
        busy={answers.busy}
        onAccept={() => setChoice('accept')}
        onReject={() => setChoice('reject')}
        onCounter={() => setCountering(true)}
      />
      {choice ? (
        <OfferAnswerSheet
          choice={choice}
          copy={offerAnswerCopy(t, 'VENUE', choice, vars, free)}
          busy={answers.busy}
          error={answers.error}
          onClose={close}
          onConfirm={confirm}
        />
      ) : null}
      {countering && offer ? (
        <VenueOfferCounterForm
          side="VENUE"
          target={{ side: 'VENUE', slotId }}
          terms={currentOfferTerms(offer)}
          maxGuests={offer.pax}
          busy={answers.busy}
          error={answers.error}
          onClose={close}
          onSend={(terms, note) => settle(answers.counter(slotId, terms, note, round))}
        />
      ) : null}
    </>
  );
}
