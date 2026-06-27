import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { MenuItem, Stack, Switch, TextField, Typography } from '@mui/material';
import PodPriceBreakdown from '../PodPriceBreakdown';
import PlaceChargesField from './PlaceChargesField';
import { getProductRequestTotal } from './DuncitProductsSection';
import { OCCURRENCES, POD_TYPES } from '../queries';
import type { PodForm } from '../queries';

interface Props {
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
  inventoryProducts: any[];
}

export default function PaymentChargesSection({ finance, inventoryProducts }: Readonly<Props>) {
  const { control, register, getValues, setValue, formState: { errors } } = useFormContext<PodForm>();
  const podType = useWatch({ control, name: 'pod_type' });
  const podAmount = useWatch({ control, name: 'pod_amount' });
  const noOfSpots = useWatch({ control, name: 'no_of_spots' });
  const podMode = useWatch({ control, name: 'pod_mode' });
  const productsEnabled = useWatch({ control, name: 'products_enabled' });
  const productRequests = useWatch({ control, name: 'product_requests' });
  const isActive = useWatch({ control, name: 'is_active' });
  const id = getValues('id');
  const isFree = podType.includes('FREE');
  const productCost = productsEnabled
    ? getProductRequestTotal(productRequests, inventoryProducts)
    : 0;
  const amountHint = isFree ? 'Free pod — amount must be 0' : 'GROSS price (incl. fee + GST). 0 – 1999.';

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Pod type"
          value={podType}
          onChange={(event) => {
            setValue('pod_type', event.target.value, { shouldValidate: true });
            if (event.target.value.includes('FREE')) setValue('pod_amount', 0);
          }}
          fullWidth
        >
          {POD_TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Occurrence"
          value={getValues('pod_occurrence')}
          onChange={(event) => setValue('pod_occurrence', event.target.value)}
          fullWidth
        >
          {OCCURRENCES.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-start">
        <TextField
          label="Amount (₹)"
          type="number"
          value={podAmount}
          onChange={(event) => setValue('pod_amount', Number(event.target.value) || 0, { shouldValidate: true })}
          inputProps={{ min: 0, max: 1999 }}
          disabled={isFree}
          helperText={errors.pod_amount?.message || amountHint}
          error={!!errors.pod_amount}
          fullWidth
        />
        <TextField
          label="No. of spots"
          type="number"
          value={noOfSpots}
          onChange={(event) => setValue('no_of_spots', Number(event.target.value) || 0, { shouldValidate: true })}
          inputProps={{ min: 0 }}
          fullWidth
          error={!!errors.no_of_spots}
          helperText={errors.no_of_spots?.message}
        />
        {id && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ pt: 1, flexShrink: 0 }}>
            <Switch
              checked={isActive}
              onChange={(_, v) => setValue('is_active', v)}
            />
            <Typography variant="body2">{isActive ? 'Active' : 'Inactive'}</Typography>
          </Stack>
        )}
      </Stack>
      {!isFree && Number(podAmount) > 0 && finance && (
        <PodPriceBreakdown
          amount={podAmount}
          finance={finance}
          productCost={productCost}
          spots={noOfSpots}
        />
      )}
      <TextField
        label="Payment terms"
        fullWidth
        multiline
        minRows={3}
        helperText="Refund policy, cancellation, tax info."
        {...register('payment_terms')}
      />
      {podMode === 'PHYSICAL' && (
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
    </Stack>
  );
}
