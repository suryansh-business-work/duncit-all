import { Stack, Typography } from '@mui/material';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import { OfferDecisionActions, OfferHistory, OfferTermsPanel, type BookingOffer } from '@duncit/availability-calendar';
import { currentOfferTerms, offerGuestsText } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { SlotDecisionRow } from './queries';

interface Props {
  request: SlotDecisionRow;
  offer: BookingOffer;
  onDone: () => unknown;
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** "8–20 guests" when the venue is paid for fewer than the pod's spots, else "20 guests" — and whether pets come. */
function guestsLine(t: Translate, offer: BookingOffer): string {
  const guests = offerGuestsText(t, currentOfferTerms(offer).minGuests, offer.pax);
  return offer.pets ? `${guests} · ${t('availability.offers.pets')}` : guests;
}

/**
 * A host's offer on the request's own page: how many guests it is for, the
 * terms on the table (the money as a range from the venue's minimum guests to
 * the pod's spots, what the venue is asked to provide, the note and when to
 * answer by), how it went so far, and the venue's answers — each of which
 * carries the round it read, and re-reads the request if the host moved first.
 */
export default function OfferDecisionPanel({ request, offer, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2} data-testid="offer-decision-panel">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <GroupsOutlinedIcon fontSize="small" color="action" aria-hidden />
        <Typography variant="body2" sx={{ fontWeight: 700 }} data-testid="offer-guests">
          {guestsLine(t, offer)}
        </Typography>
      </Stack>
      <OfferTermsPanel offer={offer} podIsFree={request.pod_is_free} />
      <OfferHistory history={offer.history} />
      <OfferDecisionActions request={request} offer={offer} onDone={onDone} />
    </Stack>
  );
}
