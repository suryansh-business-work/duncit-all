import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { PlaceChargesField } from '../PlaceChargesField';
import { PodTypeCards } from '../PodTypeCards';
import {
  PricePanel,
  SuggestedPriceLink,
  SuggestedPricesModal,
  ZeroEarningsNotice,
  type PodPricingState,
} from '../price-panel';
import { PodProductsField } from '../product-picker';
import { SpotsStepper } from '../SpotsStepper';
import { TermsAgreement } from '../TermsAgreement';
import type { SpotsBounds } from '@duncit/utils';
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
  /** Off in Club Admin mode — the Organizer Terms are the host's undertaking. */
  showTerms?: boolean;
}

/** Step 4 — Free/Paid cards, ticket price (with its suggested-price helper and
 * zero-earnings guard), spots stepper, the slot-cost / GST / earnings panel,
 * optional products and the Organizer Terms gate. mWeb twin. */
export function PricingStep({
  form,
  products,
  showProducts,
  finance,
  pricing,
  spots,
  showTerms = true,
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
    <YStack gap={14}>
      <PodTypeCards form={form} />
      <FormTextField
        control={control}
        name="pod_amount_text"
        label={t('mweb.createPod.ticketPriceLabel')}
        keyboardType="numeric"
        placeholder={t('mweb.createPod.ticketPricePlaceholder')}
        editable={!isFree}
        hint={
          isFree ? t('mweb.createPod.ticketPriceFreeHint') : t('mweb.createPod.ticketPriceHint')
        }
        labelAction={<SuggestedPriceLink onPress={() => setSuggestionsOpen(true)} />}
      />
      {pricing.zeroEarnings ? <ZeroEarningsNotice /> : null}
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
      <PricePanel finance={finance} pricing={pricing} />
      <FormTextField
        control={control}
        name="payment_terms"
        label={t('mweb.createPod.paymentTerms')}
        multiline
      />
      {isPhysical ? (
        <Controller
          control={control}
          name="place_charges"
          render={({ field }) => (
            <PlaceChargesField value={field.value} onChange={field.onChange} />
          )}
        />
      ) : null}
      {showProducts ? (
        // The "Attach products to this pod" checkbox is gone: attaching IS
        // adding a product, so `products_enabled` is derived from the row list
        // on submit rather than toggled here. `products` arrives already
        // filtered to the pod's club category, and the field says so when it is
        // empty. mWeb twin (rule 27).
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
      ) : null}
      {showTerms ? <TermsAgreement form={form} /> : null}
      <SuggestedPricesModal
        open={suggestionsOpen}
        onClose={() => setSuggestionsOpen(false)}
        noOfSpots={pricing.noOfSpots}
        venueId={pricing.venuePicked ? pricing.venueId : null}
        venueAmount={pricing.venuePicked ? pricing.slotPrice : null}
        symbol={finance.currency_symbol}
      />
    </YStack>
  );
}
