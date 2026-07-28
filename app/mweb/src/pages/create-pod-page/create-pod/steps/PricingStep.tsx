import { Controller } from 'react-hook-form';
import { Alert, FormControlLabel, Stack, Switch, TextField } from '@mui/material';
import PlaceChargesField from '../fields/PlaceChargesField';
import ProductRequestsField from '../fields/ProductRequestsField';
import PricePanel, { TicketPriceField, type EarningsPreview } from '../price-panel';
import PodTypeCards from '../PodTypeCards';
import SpotsStepper from '../SpotsStepper';
import TermsAgreement from '../TermsAgreement';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  preview: EarningsPreview;
}

/** Step 4 — Free/Paid cards, ticket price, spots stepper, the slot-cost / GST /
 * earnings panel, optional products and the Organizer Terms publish gate. */
export default function PricingStep({ form, products, showProducts, preview }: Readonly<Props>) {
  const { control, register, watch, setValue } = form;
  const isFree = watch('pod_type') === 'FREE';
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  const productsEnabled = watch('products_enabled');

  return (
    <Stack spacing={2}>
      <PodTypeCards form={form} />
      <TicketPriceField form={form} preview={preview} isFree={isFree} />
      <Controller
        control={control}
        name="no_of_spots"
        render={({ field, fieldState }) => (
          <SpotsStepper value={Number(field.value) || 0} onChange={field.onChange} error={fieldState.error?.message} readOnly={isPhysical} />
        )}
      />
      <PricePanel preview={preview} />
      <TextField
        label="Payment terms"
        fullWidth
        multiline
        minRows={3}
        helperText="Refund policy, cancellation, tax info."
        {...register('payment_terms')}
      />
      {isPhysical && (
        <Controller
          control={control}
          name="place_charges"
          render={({ field }) => (
            <PlaceChargesField
              value={field.value}
              onChange={field.onChange}
              helperText="Optional venue-side charges (entry, table, etc.) shown separately to users."
            />
          )}
        />
      )}
      {showProducts && (
        <>
          <Controller
            control={control}
            name="products_enabled"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(e) => {
                      field.onChange(e.target.checked);
                      if (!e.target.checked) setValue('product_requests', []);
                    }}
                  />
                }
                label="Attach products to this pod"
              />
            )}
          />
          {productsEnabled && products.length === 0 && (
            <Alert severity="info">No approved products are available to attach right now.</Alert>
          )}
          {productsEnabled && (
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
          )}
        </>
      )}
      <TermsAgreement form={form} />
    </Stack>
  );
}
