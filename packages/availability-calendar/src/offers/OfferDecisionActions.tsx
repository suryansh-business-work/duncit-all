import { useState } from 'react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { currentOfferTerms, offerQuoteRange, venueOfferActions } from '@duncit/utils';
import { rupees } from '../pricing/format';
import AnswerOfferDialog, { type AnswerChoice } from './AnswerOfferDialog';
import CounterAllowanceNote from './CounterAllowanceNote';
import CounterOfferDialog from './CounterOfferDialog';
import { rupeesRange } from './format';
import type { OfferTarget } from './offer-target';
import type { OfferRequestSummary, OfferTerms } from './queries';

interface Props {
  request: OfferRequestSummary;
  /** The host's offer; null for a request from before offers (accept or reject only). */
  offer: OfferTerms | null;
  onDone: () => unknown;
}

const LEGACY_ACTIONS = { accept: true, reject: true, counter: false };

/** What the venue receives if it accepts: the terms on the table, from the fewest guests to the most. */
function payoutText(request: OfferRequestSummary, offer: OfferTerms | null): string {
  if (!offer) return rupees(request.price);
  const terms = currentOfferTerms(offer);
  const range = offerQuoteRange(terms.quote, terms.quoteMin);
  return rupeesRange(range.venueMin, range.venueMax);
}

/**
 * What the venue can do with a booking request right now: Accept, Counter or
 * Reject a fresh offer; change or withdraw its counter while the host decides.
 * Countering stops once the venue's share of counters is used (the note under
 * the answers says how many are left). Each opens its own dialog — nothing is
 * decided by one tap — and answers the round it read.
 */
export default function OfferDecisionActions({ request, offer, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState<AnswerChoice | null>(null);
  const [countering, setCountering] = useState(false);
  const actions = offer ? venueOfferActions(offer) : LEGACY_ACTIONS;
  if (!actions.accept && !actions.reject && !actions.counter) return null;
  const target: OfferTarget = { side: 'VENUE', slot_id: request.slot_id };

  return (
    <>
      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {actions.reject && (
          <DuncitButton variant="outlined" color="error" onClick={() => setAnswer('reject')} data-testid={`offer-reject-${request.slot_id}`}>
            {t('availability.offers.reject')}
          </DuncitButton>
        )}
        {actions.counter && (
          <DuncitButton variant="outlined" onClick={() => setCountering(true)} data-testid={`offer-counter-${request.slot_id}`}>
            {/* While its counter waits, the venue cannot accept — and "Counter" changes that counter. */}
            {actions.accept ? t('availability.offers.counter') : t('availability.offers.changeCounter')}
          </DuncitButton>
        )}
        {actions.accept && (
          <DuncitButton variant="contained" onClick={() => setAnswer('accept')} data-testid={`offer-accept-${request.slot_id}`}>
            {t('availability.offers.accept')}
          </DuncitButton>
        )}
      </Stack>
      {offer && <CounterAllowanceNote offer={offer} side="VENUE" />}
      <AnswerOfferDialog
        target={target}
        subject={request}
        choice={answer}
        amount={payoutText(request, offer)}
        round={offer ? offer.round : null}
        onClose={() => setAnswer(null)}
        onDone={onDone}
      />
      {offer && <CounterOfferDialog open={countering} offer={offer} target={target} onClose={() => setCountering(false)} onDone={onDone} />}
    </>
  );
}
