import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
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
import { ProductRequestsField } from '../ProductRequestsField';
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
}: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const { t } = useTranslation();
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsBoundsHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;
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
        <>
          <XStack
            testID="products-enabled-toggle"
            role="button"
            aria-label={t('mweb.createPod.attachProducts')}
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
              {t('mweb.createPod.attachProducts')}
            </Text>
          </XStack>
          {/* `products` arrives already filtered to the pod's club category, so
              empty means "none in this category", not "none at all". Twin of
              mWeb's PricingStep alert (rule 27). */}
          {productsEnabled && products.length === 0 ? (
            <Text testID="products-empty" fontSize={13} color="$muted">
              {t('mweb.createPod.noProductsForCategory')}
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
