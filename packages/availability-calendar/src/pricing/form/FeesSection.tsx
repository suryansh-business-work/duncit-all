import { Controller, type Control } from 'react-hook-form';
import { FormControlLabel, Grid, Switch } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import { NumberField } from './fields';
import type { VenuePricingFormValues } from './venue-pricing.types';

interface Props {
  control: Control<VenuePricingFormValues>;
}

/** Minimum spend, the fees on top of the price, the refundable deposit and GST. */
export default function FeesSection({ control }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('venuePricing.fees.title')} subtitle={t('venuePricing.fees.subtitle')}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField
            control={control}
            name="min_spend"
            label={t('venuePricing.fees.minSpend')}
            hint={t('venuePricing.fees.minSpendHint')}
            rupee
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField
            control={control}
            name="deposit"
            label={t('venuePricing.fees.deposit')}
            hint={t('venuePricing.fees.depositHint')}
            rupee
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField control={control} name="cleaning_fee" label={t('venuePricing.fees.cleaning')} rupee />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <NumberField
            control={control}
            name="pet_fee"
            label={t('venuePricing.fees.pet')}
            hint={t('venuePricing.fees.petHint')}
            rupee
          />
        </Grid>
        <Grid size={12}>
          <Controller
            control={control}
            name="gst_enabled"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    data-testid="pricing-gst"
                  />
                }
                label={t('venuePricing.fees.gst')}
              />
            )}
          />
        </Grid>
      </Grid>
    </SectionCard>
  );
}
