import { Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { rupees } from '../../pricing/format';
import PriceBreakdownView from '../../pricing/preview/PriceBreakdownView';
import { offerTermsLabel } from '../format';
import type { PodRequestProposedOffer } from './queries';

/**
 * The terms proposed on a Pod Request — how the venue is paid, for how many
 * guests, what the venue receives and what the host pays with Duncit's fee —
 * so the side that confirms sees exactly what it agrees to.
 */
export default function ProposedTerms({ offer }: Readonly<{ offer: PodRequestProposedOffer }>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1} data-testid="pod-request-proposed-terms">
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {offerTermsLabel(t, offer.model, offer.rate)} · {t('availability.offers.guests', { vars: { n: offer.pax } })}
      </Typography>
      <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 800 }}>
        {t('availability.offers.venueReceives', { vars: { amount: rupees(offer.quote.venue_payout) } })}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('availability.offers.hostPays', { vars: { amount: rupees(offer.quote.total) } })}
      </Typography>
      <PriceBreakdownView breakdown={offer.quote} />
    </Stack>
  );
}
