import { Controller } from 'react-hook-form';
import { Alert, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import PlaceChargesField from '../fields/PlaceChargesField';
import ProductRequestsField from '../fields/ProductRequestsField';
import PricePanel from '../PricePanel';
import { POD_TYPES, type CreatePodForm, type CreatePodProduct, type CreatePodSlot } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  selectedSlot: CreatePodSlot | null;
}

/** Step 4 — pricing, spots, terms, optional products, plus the slot-cost / GST
 * / potential-earnings panel. */
export default function PricingStep({ form, products, showProducts, selectedSlot }: Readonly<Props>) {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const podType = watch('pod_type');
  const isFree = podType.includes('FREE');
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  const productsEnabled = watch('products_enabled');

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="pod_type"
        render={({ field }) => (
          <TextField
            select
            label="Pod type"
            fullWidth
            value={field.value}
            onChange={(e) => {
              field.onChange(e.target.value);
              if (e.target.value.includes('FREE')) setValue('pod_amount', 0);
            }}
          >
            {POD_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
            ))}
          </TextField>
        )}
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          label="Amount (₹)"
          type="number"
          fullWidth
          disabled={isFree}
          error={!!errors.pod_amount}
          helperText={errors.pod_amount?.message ?? (isFree ? 'Free pod amount must be 0.' : 'Gross ticket price, max 1999.')}
          {...register('pod_amount', { valueAsNumber: true })}
        />
        <TextField
          label="No. of spots"
          type="number"
          fullWidth
          error={!!errors.no_of_spots}
          helperText={errors.no_of_spots?.message ?? 'Auto-filled from the venue space you pick — adjust if needed'}
          {...register('no_of_spots', { valueAsNumber: true })}
        />
      </Stack>
      <PricePanel
        slotPrice={selectedSlot ? selectedSlot.price : null}
        podAmount={Number(watch('pod_amount')) || 0}
        spots={Number(watch('no_of_spots')) || 0}
        isPhysical={isPhysical}
      />
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
    </Stack>
  );
}
