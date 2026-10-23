import { Stack } from '@mui/material';
import { OfferDecisionActions, OfferHistory, OfferTermsPanel, type BookingOffer } from '@duncit/availability-calendar';
import type { SlotDecisionRow } from './queries';

interface Props {
  request: SlotDecisionRow;
  offer: BookingOffer;
  onDone: () => unknown;
}

/** A host's offer on the request's own page: the terms on the table, how it went so far, and the venue's answers. */
export default function OfferDecisionPanel({ request, offer, onDone }: Readonly<Props>) {
  return (
    <Stack spacing={2} data-testid="offer-decision-panel">
      <OfferTermsPanel offer={offer} podIsFree={request.pod_is_free} />
      <OfferHistory history={offer.history} />
      <OfferDecisionActions request={request} offer={offer} onDone={onDone} />
    </Stack>
  );
}
