import { YStack } from 'tamagui';
import type { FreePodVenueNotice } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import type { PodPricingState } from '../price-panel';
import type {
  CreatePodFinance,
  CreatePodForm,
  CreatePodProduct,
  CreatePodVenue,
} from '../create-pod.types';
import { PricingStep } from './PricingStep';
import { VenueOfferStep } from './VenueOfferStep';
import type { VenueQuoteState } from './VenueSlotStep/VenueQuoteCard';

interface Props {
  form: CreatePodForm;
  venues: CreatePodVenue[];
  /** The pod sends its venue an offer (createPodSendsOffer) — a virtual pod or a held slot does not. */
  sendsOffer: boolean;
  quote: VenueQuoteState;
  products: CreatePodProduct[];
  showProducts: boolean;
  finance: CreatePodFinance;
  pricing: PodPricingState;
  venueNotice: FreePodVenueNotice;
  forClubAdmin: boolean;
}

/** Step 3 — Money: what the host offers the venue (only when it sends one),
 * then the ticket members pay and what the host earns. mWeb twin. */
export function MoneyStep({
  form,
  venues,
  sendsOffer,
  quote,
  products,
  showProducts,
  finance,
  pricing,
  venueNotice,
  forClubAdmin,
}: Readonly<Props>) {
  return (
    <YStack gap={16} testID="create-pod-money-step">
      {sendsOffer ? (
        <SurfaceCard>
          <VenueOfferStep
            form={form}
            venues={venues}
            quote={quote}
            currencySymbol={finance.currency_symbol}
          />
        </SurfaceCard>
      ) : null}
      <PricingStep
        form={form}
        products={products}
        showProducts={showProducts}
        finance={finance}
        pricing={pricing}
        venueNotice={venueNotice}
        forClubAdmin={forClubAdmin}
      />
    </YStack>
  );
}
