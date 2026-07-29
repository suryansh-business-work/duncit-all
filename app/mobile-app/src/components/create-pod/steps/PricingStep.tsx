import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PlaceChargesField } from '../PlaceChargesField';
import { PodTypeCards } from '../PodTypeCards';
import {
  PricePanel,
  SuggestedPriceLink,
  SuggestedPricesModal,
  ZeroEarningsNotice,
  type PodPricingState,
} from '../price-panel';
import { TICKET_PRICE_LABEL } from '../price-panel/step4-copy';
import { ProductRequestsField } from '../ProductRequestsField';
import { SpotsStepper } from '../SpotsStepper';
import { TermsAgreement } from '../TermsAgreement';
import type { CreatePodFinance, CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  finance: CreatePodFinance;
  /** Step 4's shared money state, owned by the stepper (it gates Create Pod). */
  pricing: PodPricingState;
}

/** Step 4 — Free/Paid cards, ticket price (with its suggested-price helper and
 * zero-earnings guard), spots stepper, the slot-cost / GST / earnings panel,
 * optional products and the Organizer Terms gate. mWeb twin. */
export function PricingStep({ form, products, showProducts, finance, pricing }: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const { color } = useThemeColors();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  const isFree = watch('pod_type') === 'FREE';
  const productsEnabled = watch('products_enabled');
  const toggleProducts = () => {
    const next = !productsEnabled;
    setValue('products_enabled', next);
    if (!next) setValue('product_requests', []);
  };

  return (
    <YStack gap={14}>
      <PodTypeCards form={form} />
      <FormTextField
        control={control}
        name="pod_amount_text"
        label={TICKET_PRICE_LABEL}
        keyboardType="numeric"
        editable={!isFree}
        hint={isFree ? 'Free pods are ₹0.' : 'Gross ticket price, max 1999.'}
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
            readOnly={isPhysical}
          />
        )}
      />
      <PricePanel finance={finance} pricing={pricing} />
      <FormTextField control={control} name="payment_terms" label="Payment terms" multiline />
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
        <>
          <XStack
            testID="products-enabled-toggle"
            role="button"
            aria-label="Attach products"
            aria-pressed={productsEnabled}
            onPress={toggleProducts}
            alignItems="center"
            gap={8}
            pressStyle={{ opacity: 0.7 }}
          >
            <MaterialIcons
              name={productsEnabled ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={color}
            />
            <Text fontSize={14} fontWeight="600" color="$color">
              Attach products to this pod
            </Text>
          </XStack>
          {/* `products` arrives already filtered to the pod's club category, so
              empty means "none in this category", not "none at all". Twin of
              mWeb's PricingStep alert (rule 27). */}
          {productsEnabled && products.length === 0 ? (
            <Text testID="products-empty" fontSize={13} color="$muted">
              No products available for this category.
            </Text>
          ) : null}
          {productsEnabled ? (
            <Controller
              control={control}
              name="product_requests"
              render={({ field, fieldState }) => (
                <ProductRequestsField
                  value={field.value}
                  onChange={field.onChange}
                  products={products}
                  error={fieldState.error?.message}
                />
              )}
            />
          ) : null}
        </>
      ) : null}
      <TermsAgreement form={form} />
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
