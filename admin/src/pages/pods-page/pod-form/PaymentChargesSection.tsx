import { useFormikContext } from 'formik';
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

export default function PaymentChargesSection({ finance, inventoryProducts }: Props) {
  const { values, errors, touched, handleChange, setFieldValue } = useFormikContext<PodForm>();
  const isFree = values.pod_type.includes('FREE');
  const productCost = values.products_enabled
    ? getProductRequestTotal(values.product_requests, inventoryProducts)
    : 0;
  const err = (k: keyof PodForm) => !!touched[k] && !!errors[k];
  const help = (k: keyof PodForm) => (touched[k] ? (errors[k] as string) : undefined);

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          label="Pod type"
          name="pod_type"
          value={values.pod_type}
          onChange={(e) => {
            setFieldValue('pod_type', e.target.value);
            if (e.target.value.includes('FREE')) setFieldValue('pod_amount', 0);
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
          name="pod_occurrence"
          value={values.pod_occurrence}
          onChange={handleChange}
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
          name="pod_amount"
          value={values.pod_amount}
          onChange={(e) => setFieldValue('pod_amount', Number(e.target.value) || 0)}
          inputProps={{ min: 0, max: 1999 }}
          disabled={isFree}
          helperText={
            help('pod_amount') ||
            (isFree ? 'Free pod — amount must be 0' : 'GROSS price (incl. fee + GST). 0 – 1999.')
          }
          error={err('pod_amount')}
          fullWidth
        />
        <TextField
          label="No. of spots"
          type="number"
          name="no_of_spots"
          value={values.no_of_spots}
          onChange={(e) => setFieldValue('no_of_spots', Number(e.target.value) || 0)}
          inputProps={{ min: 0 }}
          fullWidth
          error={err('no_of_spots')}
          helperText={help('no_of_spots')}
        />
        {values.id && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ pt: 1, flexShrink: 0 }}>
            <Switch
              checked={values.is_active}
              onChange={(_, v) => setFieldValue('is_active', v)}
            />
            <Typography variant="body2">{values.is_active ? 'Active' : 'Inactive'}</Typography>
          </Stack>
        )}
      </Stack>
      {!isFree && Number(values.pod_amount) > 0 && finance && (
        <PodPriceBreakdown
          amount={values.pod_amount}
          finance={finance}
          productCost={productCost}
          spots={values.no_of_spots}
        />
      )}
      <TextField
        label="Payment terms"
        name="payment_terms"
        value={values.payment_terms}
        onChange={handleChange}
        fullWidth
        multiline
        minRows={3}
        helperText="Refund policy, cancellation, tax info."
      />
      <PlaceChargesField
        value={values.place_charges}
        onChange={(next) => setFieldValue('place_charges', next)}
        helperText="Optional venue-side charges (entry, table, etc.) shown separately to users."
      />
    </Stack>
  );
}
