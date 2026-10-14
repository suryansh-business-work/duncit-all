import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { PlaceChargesField } from '../PlaceChargesField';
import { PodTicketDiscountCard } from '../PodTicketDiscountCard';
import { PodTypeCards } from '../PodTypeCards';
import {
  FreePodNote,
  PricePanel,
  SuggestedPriceLink,
  SuggestedPricesModal,
  ZeroEarningsNotice,
  type PodPricingState,
} from '../price-panel';
import { PodProductsField } from '../product-picker';
import { SpotsStepper } from '../SpotsStepper';
import { TermsAgreement } from '../TermsAgreement';
import type { FreePodVenueNotice, SpotsBounds } from '@duncit/utils';
import type { CreatePodFinance, CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  finance: CreatePodFinance;
  /** Step 4's shared money state, owned by the stepper (it gates Create Pod). */
  pricing: PodPricingState;
  /** The range the host may size this pod within (sub-category min → venue capacity). */
  spots: SpotsBounds;
  /** What a free pod's host is told about the picked slot's venue charges. */
  venueNotice: FreePodVenueNotice;
  /** Off in Club Admin mode — the Organizer Terms are the host's undertaking. */
  showTerms?: boolean;
  /** A club admin is creating the pod for a host — the venue note speaks of the host. */
  forClubAdmin?: boolean;
}

/** Step 4 — Free/Paid cards, spots stepper, optional products and the Organizer
 * Terms gate. A PAID pod adds the ticket price (with its suggested-price helper
 * and zero-earnings guard), its multi-ticket discount and the slot-cost / GST /
 * earnings panel; a FREE pod has none of them — no amount and no calculation —
 * and reads a short note instead. mWeb twin. */
export function PricingStep({
  form,
  products,
  showProducts,
  finance,
  pricing,
  spots,
  venueNotice,
  showTerms = true,
  forClubAdmin = false,
}: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const { t } = useTranslation();
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsBoundsHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  const isFree = watch('pod_type') === 'FREE';

  return (
    <YStack testID="pricing-step" gap={16}>
      <SurfaceCard testID="pricing-step-price-card" gap={16}>
        <PodTypeCards form={form} />
        {isFree ? null : (
          <FormTextField
            control={control}
            name="pod_amount_text"
            label={t('mweb.createPod.ticketPriceLabel')}
            keyboardType="numeric"
            placeholder={t('mweb.createPod.ticketPricePlaceholder')}
            hint={t('mweb.createPod.ticketPriceHint')}
            labelAction={<SuggestedPriceLink onPress={() => setSuggestionsOpen(true)} />}
          />
        )}
        {!isFree && pricing.zeroEarnings ? <ZeroEarningsNotice /> : null}
        <Controller
          control={control}
          name="no_of_spots_text"
          render={({ field, fieldState }) => (
            <SpotsStepper
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
              min={spots.min}
              max={spots.max}
              slidable={spots.slidable}
              boundsHint={boundsHint}
              // Only fixed when the venue leaves no room to choose.
              readOnly={isPhysical && !spots.slidable}
            />
          )}
        />
      </SurfaceCard>
      {isFree ? (
        <FreePodNote venueNotice={venueNotice} forClubAdmin={forClubAdmin} />
      ) : (
        <PricePanel finance={finance} pricing={pricing} />
      )}
      {isFree ? null : <PodTicketDiscountCard form={form} currency={finance.currency_symbol} />}
      {/* Payment terms describe refunds and charges a free pod does not have. */}
      {isFree ? null : (
        <SurfaceCard testID="pricing-step-payment-terms-card">
          <FormTextField
            control={control}
            name="payment_terms"
            label={t('mweb.createPod.paymentTerms')}
            multiline
          />
        </SurfaceCard>
      )}
      {isPhysical ? (
        <SurfaceCard testID="pricing-step-place-charges-card">
          <Controller
            control={control}
            name="place_charges"
            render={({ field }) => (
              <PlaceChargesField value={field.value} onChange={field.onChange} />
            )}
          />
        </SurfaceCard>
      ) : null}
      {showProducts ? (
        // The "Attach products to this pod" checkbox is gone: attaching IS
        // adding a product, so `products_enabled` is derived from the row list
        // on submit rather than toggled here. `products` arrives already
        // filtered to the pod's club category, and the field says so when it is
        // empty. mWeb twin (rule 27).
        <SurfaceCard testID="pricing-step-products-card">
          <Controller
            control={control}
            name="product_requests"
            render={({ field, fieldState }) => (
              <PodProductsField
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('products_enabled', next.length > 0);
                }}
                products={products}
                error={fieldState.error?.message}
              />
            )}
          />
        </SurfaceCard>
      ) : null}
      {showTerms ? <TermsAgreement form={form} /> : null}
      {isFree ? null : (
        <SuggestedPricesModal
          open={suggestionsOpen}
          onClose={() => setSuggestionsOpen(false)}
          noOfSpots={pricing.noOfSpots}
          venueId={pricing.venuePicked ? pricing.venueId : null}
          venueAmount={pricing.venuePicked ? pricing.slotPrice : null}
          symbol={finance.currency_symbol}
        />
      )}
    </YStack>
  );
}
