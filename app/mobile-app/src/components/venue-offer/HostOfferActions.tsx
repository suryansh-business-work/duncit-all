import { useState } from 'react';
import { slotSpanLabel } from '@duncit/slots';
import {
  currentOfferTerms,
  hostOfferActions,
  offerCounterAllowance,
  offerQuoteRange,
} from '@duncit/utils';

import { VenueOfferCounterForm } from '@/forms/venue-offer-counter';
import { useDateFormat } from '@/hooks/useDateFormat';
import type { HostOfferAnswers } from '@/hooks/usePodVenueOffer';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { offerAnswerCopy, type AnswerChoice } from './answer-copy';
import { OfferActionButtons } from './OfferActionButtons';
import { OfferAnswerSheet } from './OfferAnswerSheet';
import { offerMoneyRange, type OfferTerms } from './offer-format';

interface Props {
  /** The host's pod — what the counter-back is priced and sent for. */
  podId: string;
  /** The pod's live offer (`usePodVenueOffer`). */
  offer: OfferTerms;
  /** Named in the accept's confirmation. */
  podTitle: string;
  venueName: string;
  answers: HostOfferAnswers;
}

/**
 * What the host can do with the venue's counter while it waits on them: Accept
 * it (the pod goes live), Reject it (the hold is released; they may send a new
 * offer) or Counter back with terms of their own while they have counters
 * left — each in its own sheet, sent for the round they read. Nothing once it
 * is not their move. mWeb twin: HostOfferActions.
 */
export function HostOfferActions({ podId, offer, podTitle, venueName, answers }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [choice, setChoice] = useState<AnswerChoice | null>(null);
  const [countering, setCountering] = useState(false);
  const actions = hostOfferActions(offer);
  const terms = currentOfferTerms(offer);
  const close = () => {
    answers.clearError();
    setChoice(null);
    setCountering(false);
  };
  const settle = (answered: Promise<boolean>) =>
    fireAndForget(answered.then((done) => done && close()));
  const confirm = (reason: string) =>
    settle(choice === 'accept' ? answers.accept(offer.round) : answers.reject(reason, offer.round));
  const range = offerQuoteRange(terms.quote, terms.quoteMin);
  const vars = {
    pod: podTitle,
    venue: venueName,
    when: slotSpanLabel(offer.start_at, offer.end_at, false, fmt, t('availability.wholeDay')),
    amount: offerMoneyRange(range.venueMin, range.venueMax),
  };

  return (
    <>
      <OfferActionButtons
        testIDPrefix="host-offer"
        actions={actions}
        allowance={offerCounterAllowance(offer, 'HOST')}
        busy={answers.busy}
        onAccept={() => setChoice('accept')}
        onReject={() => setChoice('reject')}
        onCounter={() => setCountering(true)}
      />
      {choice ? (
        <OfferAnswerSheet
          choice={choice}
          copy={offerAnswerCopy(t, 'HOST', choice, vars, false)}
          busy={answers.busy}
          error={answers.error}
          onClose={close}
          onConfirm={confirm}
        />
      ) : null}
      {countering ? (
        <VenueOfferCounterForm
          side="HOST"
          target={{ side: 'HOST', podId }}
          terms={terms}
          maxGuests={offer.pax}
          busy={answers.busy}
          error={answers.error}
          onClose={close}
          onSend={(next, note) => settle(answers.counter(next, note, offer.round))}
        />
      ) : null}
    </>
  );
}
