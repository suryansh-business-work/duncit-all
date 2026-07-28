import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PlaceChargesField } from '../PlaceChargesField';
import { PodTypeCards } from '../PodTypeCards';
import { PricePanel } from '../price-panel';
import { ProductRequestsField } from '../ProductRequestsField';
import { SpotsStepper } from '../SpotsStepper';
import { TermsAgreement } from '../TermsAgreement';
import type {
  CreatePodFinance,
  CreatePodForm,
  CreatePodProduct,
  CreatePodSlot,
} from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  selectedSlot: CreatePodSlot | null;
  finance: CreatePodFinance;
}

/** Step 4 — Free/Paid cards, ticket price, spots stepper, the slot-cost / GST /
 * earnings panel, optional products and the Organizer Terms gate. mWeb twin. */
export function PricingStep({
  form,
  products,
  showProducts,
  selectedSlot,
  finance,
}: Readonly<Props>) {
  const { control, watch, setValue } = form;
  const { color } = useThemeColors();
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
        label="Ticket price (₹ per person)"
        keyboardType="numeric"
        editable={!isFree}
        hint={isFree ? 'Free pods are ₹0.' : 'Gross ticket price, max 1999.'}
      />
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
      <PricePanel
        finance={finance}
        slotPrice={selectedSlot ? selectedSlot.price : null}
        venueId={watch('venue_id') || null}
        podAmount={Number(watch('pod_amount_text')) || 0}
        noOfSpots={Number(watch('no_of_spots_text')) || 0}
        isPhysical={isPhysical}
      />
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
    </YStack>
  );
}
