import type { Control, FieldValues, Path } from 'react-hook-form';
import { Grid, MenuItem } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { RhfTextField } from '@duncit/forms';
import { VENUE_OFFER_COUNTER_MODELS } from '@duncit/forms/schemas';
import { VENUE_OFFER_INBOX_MODEL_KEY } from '@duncit/utils';

/** Any offer form with a pricing option (`model`) and an amount (`rate`, as typed text). */
interface OfferTermsShape extends FieldValues {
  model: string;
  rate: string;
}

/**
 * The two terms every venue offer carries — how the venue is paid and how much —
 * as two grid cells, so the counter form and the time-window form ask them the
 * same way.
 */
export default function OfferTermsFields<T extends OfferTermsShape>({ control }: Readonly<{ control: Control<T> }>) {
  const { t } = useTranslation();
  return (
    <>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField control={control} name={'model' as Path<T>} select label={t('availability.offers.pricingOption')}>
          {VENUE_OFFER_COUNTER_MODELS.map((option) => (
            <MenuItem key={option} value={option}>
              {t(VENUE_OFFER_INBOX_MODEL_KEY[option].label)}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <RhfTextField
          control={control}
          name={'rate' as Path<T>}
          type="number"
          label={t('availability.offers.amount')}
          slotProps={{ htmlInput: { min: 0, step: 'any', inputMode: 'decimal' } }}
        />
      </Grid>
    </>
  );
}
