import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, FormControlLabel, Grid, Stack, Switch, Typography } from '@mui/material';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import { RhfTextField } from '@duncit/forms';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import {
  DELIVERY_LIMITS,
  makeDeliverySettingsSchema,
  toDeliveryInput,
  toDeliveryValues,
  type DeliverySettingsFormProps,
  type DeliverySettingsValues,
} from './delivery-settings.types';

type MeasureField = 'parcel_weight_kg' | 'parcel_length_cm' | 'parcel_breadth_cm' | 'parcel_height_cm';
const MEASURES: readonly MeasureField[] = ['parcel_weight_kg', 'parcel_length_cm', 'parcel_breadth_cm', 'parcel_height_cm'];

/**
 * How gift cards are bought and delivered: the most cards one order may hold,
 * whether printed cards can be ordered, the flat delivery fee every printed
 * order pays (once, whatever its quantity), where they ship from and the
 * packed envelope the courier rates.
 */
export default function DeliverySettingsForm({ settings, busy, readOnly = false, onSubmit }: Readonly<DeliverySettingsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeDeliverySettingsSchema(t), [t]);
  const { control, handleSubmit, reset } = useForm<DeliverySettingsValues>({
    defaultValues: toDeliveryValues(settings),
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });
  useEffect(() => reset(toDeliveryValues(settings)), [settings, reset]);
  const measureLabel: Record<MeasureField, string> = {
    parcel_weight_kg: t('loyalty.giftSettings.parcelWeight'),
    parcel_length_cm: t('loyalty.giftSettings.parcelLength'),
    parcel_breadth_cm: t('loyalty.giftSettings.parcelBreadth'),
    parcel_height_cm: t('loyalty.giftSettings.parcelHeight'),
  };

  return (
    <Card variant="outlined">
      <CardContent>
        <form noValidate onSubmit={handleSubmit((values) => onSubmit(toDeliveryInput(values)))} data-testid="delivery-settings-form">
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <LocalShippingIcon color="primary" />
              <Typography component="h2" variant="h6" sx={{ fontWeight: 800 }}>
                {t('loyalty.giftSettings.deliveryTitle')}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t('loyalty.giftSettings.deliveryBody')}
            </Typography>
            <Controller
              control={control}
              name="physical_enabled"
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} disabled={readOnly} />}
                  label={t('loyalty.giftSettings.physicalEnabled')}
                />
              )}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <RhfTextField control={control} name="shipping_fee" label={t('loyalty.giftSettings.shippingFee')} hint={t('loyalty.giftSettings.shippingFeeHint')} inputMode="decimal" fullWidth disabled={readOnly} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <RhfTextField control={control} name="max_quantity" label={t('loyalty.giftSettings.maxQuantity')} inputMode="numeric" fullWidth disabled={readOnly} />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <RhfTextField
                  control={control}
                  name="pickup_location"
                  label={t('loyalty.giftSettings.pickupLocation')}
                  hint={t('loyalty.giftSettings.pickupHint')}
                  slotProps={{ htmlInput: { maxLength: DELIVERY_LIMITS.pickupMax } }}
                  fullWidth
                  disabled={readOnly}
                />
              </Grid>
              {MEASURES.map((name) => (
                <Grid key={name} size={{ xs: 6, sm: 3 }}>
                  <RhfTextField control={control} name={name} label={measureLabel[name]} inputMode="decimal" fullWidth disabled={readOnly} />
                </Grid>
              ))}
            </Grid>
            {!readOnly && (
              <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
                <DuncitButton type="submit" variant="contained" loading={busy} data-testid="delivery-settings-save">
                  {t('loyalty.giftSettings.save')}
                </DuncitButton>
              </Stack>
            )}
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
}
