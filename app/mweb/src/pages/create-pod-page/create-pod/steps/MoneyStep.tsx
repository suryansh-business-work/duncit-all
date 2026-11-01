import { Box, Stack } from '@mui/material';
import type { FreePodVenueNotice } from '@duncit/utils';
import type { EarningsPreview } from '../price-panel';
import { SURFACE_SX } from '../../../../theme';
import PricingStep from './PricingStep';
import VenueOfferStep from './VenueOfferStep';
import type { CreatePodForm, CreatePodProduct, CreatePodVenue } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  /** The pod sends its venue an offer (createPodSendsOffer) — a virtual pod or a held slot does not. */
  sendsOffer: boolean;
  products: CreatePodProduct[];
  showProducts: boolean;
  preview: EarningsPreview;
  venueNotice: FreePodVenueNotice;
}

/** Step 3 — Money: what the host offers the venue (only when it sends one),
 * then the ticket members pay and what the host earns. Native twin: MoneyStep. */
export default function MoneyStep({ form, venues, sendsOffer, products, showProducts, preview, venueNotice }: Readonly<Props>) {
  return (
    <Stack data-testid="create-pod-money-step" spacing={2}>
      {sendsOffer && (
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <VenueOfferStep form={form} venues={venues} />
        </Box>
      )}
      <PricingStep form={form} products={products} showProducts={showProducts} preview={preview} venueNotice={venueNotice} />
    </Stack>
  );
}
