import { Controller } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useThemeColors } from '@/hooks/useThemeColors';
import { ChipSelectField } from '../ChipSelectField';
import { PlaceChargesField } from '../PlaceChargesField';
import { PricePanel } from '../PricePanel';
import { ProductRequestsField } from '../ProductRequestsField';
import {
  OCCURRENCES,
  POD_TYPES,
  type CreatePodFinance,
  type CreatePodForm,
  type CreatePodProduct,
  type CreatePodSlot,
} from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  selectedSlot: CreatePodSlot | null;
  finance: CreatePodFinance;
}

/** Step 4 — pricing, occurrence, spots, terms, optional products, plus the
 * slot-cost / GST / potential-earnings panel. mWeb twin. */
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
  const isFree = watch('pod_type').includes('FREE');
  const productsEnabled = watch('products_enabled');
  const toggleProducts = () => {
    const next = !productsEnabled;
    setValue('products_enabled', next);
    if (!next) setValue('product_requests', []);
  };

  return (
    <YStack gap={14}>
      <Controller
        control={control}
        name="pod_type"
        render={({ field }) => (
          <ChipSelectField
            label="Pod type"
            options={[...POD_TYPES]}
            value={field.value}
            onChange={(next) => {
              field.onChange(next);
              if (next.includes('FREE')) setValue('pod_amount_text', '0');
            }}
            testID="create-pod-type"
          />
        )}
      />
      <Controller
        control={control}
        name="pod_occurrence"
        render={({ field }) => (
          <ChipSelectField
            label="Occurrence"
            options={[...OCCURRENCES]}
            value={field.value}
            onChange={field.onChange}
            testID="create-pod-occurrence"
          />
        )}
      />
      <FormTextField
        control={control}
        name="pod_amount_text"
        label="Amount (₹)"
        keyboardType="numeric"
        hint={isFree ? 'Free pod amount must be 0.' : 'Gross ticket price, max 1999.'}
      />
      <FormTextField
        control={control}
        name="no_of_spots_text"
        label="No. of spots"
        keyboardType="numeric"
        hint="How many attendees can join"
      />
      <PricePanel
        finance={finance}
        slotPrice={selectedSlot ? selectedSlot.price : null}
        podAmount={Number(watch('pod_amount_text')) || 0}
        spots={Number(watch('no_of_spots_text')) || 0}
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
    </YStack>
  );
}
