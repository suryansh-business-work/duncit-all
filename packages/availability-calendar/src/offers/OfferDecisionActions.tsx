import { useState } from 'react';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { currentOfferTerms, venueOfferActions } from '@duncit/utils';
import AnswerOfferDialog, { type AnswerChoice } from './AnswerOfferDialog';
import CounterOfferDialog from './CounterOfferDialog';
import type { BookingOffer, OfferRequestSummary } from './queries';

interface Props {
  request: OfferRequestSummary;
  /** The host's offer; null for a request from before offers (accept or reject only). */
  offer: BookingOffer | null;
  onDone: () => unknown;
}

const LEGACY_ACTIONS = { accept: true, reject: true, counter: false };

/**
 * What the venue can do with a booking request right now: Accept, Counter or
 * Reject a fresh offer; change or withdraw its counter while the host decides.
 * Each opens its own dialog — nothing is decided by one tap.
 */
export default function OfferDecisionActions({ request, offer, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [answer, setAnswer] = useState<AnswerChoice | null>(null);
  const [countering, setCountering] = useState(false);
  const actions = offer ? venueOfferActions(offer) : LEGACY_ACTIONS;
  const payout = offer ? currentOfferTerms(offer).quote.venue_payout : request.price;
  if (!actions.accept && !actions.reject && !actions.counter) return null;

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
      <AnswerOfferDialog request={request} choice={answer} payout={payout} onClose={() => setAnswer(null)} onDone={onDone} />
      {offer && <CounterOfferDialog open={countering} offer={offer} onClose={() => setCountering(false)} onDone={onDone} />}
    </>
  );
}
