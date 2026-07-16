import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { RhfTextField } from '@duncit/forms';
import { AD_POSITIONS, formatAdMoney, type AdPosition } from '../../../lib/ad-positions';
import {
  adsPricingSchema,
  type AdsPricingFormProps,
  type AdsPricingFormValues,
} from './ads-pricing.types';

export { adsPricingSchema };
export { fromAdPricing, toUpdateAdPricingInput } from './ads-pricing.types';

/** Live example — recomputes from the current (possibly unsaved) form values. */
function AdsPricingExample({ values }: Readonly<{ values: AdsPricingFormValues }>) {
  const [position, setPosition] = useState<AdPosition>('HOME_BOTTOM');
  const [days, setDays] = useState('7');

  /* v8 ignore next -- `position` is always a valid AdPosition from the constrained select, so the `?? AD_POSITIONS[0]` fallback is unreachable */
  const meta = AD_POSITIONS.find((p) => p.position === position) ?? AD_POSITIONS[0];
  const perDay = Number(values[meta.priceField]);
  const dayCount = Number(days);
  const isComputable = Number.isFinite(perDay) && perDay >= 0 && dayCount >= 1;
  const exampleText = isComputable
    ? `${meta.label} × ${dayCount} days = ${formatAdMoney(values.currency_symbol.trim() || '₹', perDay * dayCount)}`
    : 'Enter a valid price and day count to see the estimate.';

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Live example
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
        <TextField
          select
          size="small"
          label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value as AdPosition)}
          sx={{ minWidth: 220 }}
        >
          {AD_POSITIONS.map((p) => (
            <MenuItem key={p.position} value={p.position}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Days"
          type="number"
          inputProps={{ min: 1, max: 30 }}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          sx={{ width: 110 }}
        />
        <Typography variant="body1" fontWeight={700}>
          {exampleText}
        </Typography>
      </Stack>
    </Paper>
  );
}

export default function AdsPricingForm({
  initialValues,
  busy,
  errorMessage,
  onSubmit,
}: Readonly<AdsPricingFormProps>) {
  const { control, handleSubmit, reset, watch, formState } = useForm<AdsPricingFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(adsPricingSchema),
    mode: 'onChange',
  });

  useEffect(() => reset(initialValues), [initialValues, reset]);

  const values = watch();
  const submit = handleSubmit((v) => onSubmit(v));

  return (
    <form noValidate onSubmit={submit}>
      <Grid container spacing={2}>
        {AD_POSITIONS.map((p) => (
          <Grid item xs={12} sm={6} md={4} key={p.position}>
            <RhfTextField
              control={control}
              name={p.priceField}
              label={`${p.label} — per day`}
              type="number"
              inputProps={{ min: 0, step: '0.01' }}
              hint="Price charged per day for this placement"
            />
          </Grid>
        ))}
        <Grid item xs={12} sm={6} md={4}>
          <RhfTextField
            control={control}
            name="currency_symbol"
            label="Currency symbol"
            hint="Shown next to every ad price (e.g. ₹)"
          />
        </Grid>
        <Grid item xs={12}>
          <AdsPricingExample values={values} />
        </Grid>
        {errorMessage && (
          <Grid item xs={12}>
            <Alert severity="error">{errorMessage}</Alert>
          </Grid>
        )}
        <Grid item xs={12}>
          <Stack direction="row" justifyContent="flex-end">
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={busy || !formState.isValid}
            >
              {busy ? 'Saving…' : 'Save Pricing'}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </form>
  );
}
