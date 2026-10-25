import { useState } from 'react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { currentOfferTerms, hostOfferActions, offerQuoteRange } from '@duncit/utils';
import AnswerOfferDialog, { type AnswerChoice } from '../AnswerOfferDialog';
import CounterOfferDialog from '../CounterOfferDialog';
import { rupeesRange } from '../format';
import type { OfferTarget } from '../offer-target';
import type { PodOffer } from './queries';

/** The pod an answer is about, and the venue it is booked at — named in the confirmation. */
export interface OfferSubject {
  pod_id: string;
  pod_title: string;
  venue_name: string;
}

interface Props {
  /** The pod's live offer (`usePodVenueOffer`). */
  offer: PodOffer;
  subject: OfferSubject;
  /** Re-reads whatever shows the offer, after any answer. */
  onDone: () => unknown;
}

/**
 * What the host can do with the venue's counter while it waits on them: Accept
 * it (the pod goes live), Reject it (the hold is released; they may send a new
 * offer) or Counter back with terms of their own. Each opens its own dialog and
 * answers the round it read. Nothing once it is not their move.
 */
export default function HostOfferActions({ offer, subject, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState<AnswerChoice | null>(null);
  const [countering, setCountering] = useState(false);
  const actions = hostOfferActions(offer);
  if (!actions.accept && !actions.reject && !actions.counter) return null;
  const target: OfferTarget = { side: 'HOST', pod_id: subject.pod_id };
  const terms = currentOfferTerms(offer);
  const range = offerQuoteRange(terms.quote, terms.quoteMin);

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {actions.reject && (
          <DuncitButton variant="outlined" color="error" onClick={() => setAnswer('reject')} data-testid="host-offer-reject">
            {t('availability.offers.reject')}
          </DuncitButton>
        )}
        {actions.counter && (
          <DuncitButton variant="outlined" onClick={() => setCountering(true)} data-testid="host-offer-counter">
            {t('availability.offers.counter')}
          </DuncitButton>
        )}
        {actions.accept && (
          <DuncitButton variant="contained" onClick={() => setAnswer('accept')} data-testid="host-offer-accept">
            {t('availability.offers.accept')}
          </DuncitButton>
        )}
      </Stack>
      <AnswerOfferDialog
        target={target}
        subject={{ ...subject, start_at: offer.start_at, end_at: offer.end_at, pod_is_free: false }}
        choice={answer}
        amount={rupeesRange(range.venueMin, range.venueMax)}
        round={offer.round}
        onClose={() => setAnswer(null)}
        onDone={onDone}
      />
      <CounterOfferDialog open={countering} offer={offer} target={target} onClose={() => setCountering(false)} onDone={onDone} />
    </>
  );
}
