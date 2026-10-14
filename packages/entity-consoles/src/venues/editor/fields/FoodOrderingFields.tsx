import { FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import { Controller, useWatch, type Control } from 'react-hook-form';
import { FoodTaxFields, RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';

const ENABLED_HINT_ID = 'venue-editor-food-ordering-hint';

/**
 * QR ordering, as the console may set it: the switch, the discount and the
 * venue's GST. The Razorpay account guests pay is the owner's own — linked from
 * the Partners portal — so the console only says whether there is one, and
 * the switch cannot be turned ON without it (the server refuses that too).
 */
export default function FoodOrderingFields({
  control,
  config,
}: Readonly<{ control: Control<VenueFormValues>; config: VenueRegistrationConfig }>) {
  const { t } = useTranslation();
  const linked = useWatch({ control, name: 'food_ordering.razorpay_linked' });

  return (
    <Stack spacing={1.5} data-testid="venue-editor-food-ordering">
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700 }}>
        {t('directory.venueFood.qrOrdering')}
      </Typography>
      <Controller
        control={control}
        name="food_ordering.enabled"
        render={({ field }) => (
          <Stack spacing={0}>
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  disabled={!linked && !field.value}
                  slotProps={{ input: { 'aria-describedby': ENABLED_HINT_ID } }}
                  data-testid="venue-editor-food-ordering-enabled"
                />
              }
              label={t('directory.venueEditor.orderingEnabled')}
            />
            <FormHelperText id={ENABLED_HINT_ID} sx={{ mt: 0 }}>
              {linked ? t('directory.venueEditor.orderingAccountLinked') : t('directory.venueEditor.orderingAccountMissing')}
            </FormHelperText>
          </Stack>
        )}
      />
      <RhfTextField
        control={control}
        name="food_ordering.discount_pct"
        label={t('directory.venueFood.discount')}
        hint={t('directory.venueEditor.orderingDiscountHint', { vars: { max: config.food_discount_max_pct } })}
        type="number"
        size="small"
        fullWidth={false}
        sx={{ maxWidth: 260 }}
        slotProps={{ htmlInput: { min: 0, max: config.food_discount_max_pct, step: 1 } }}
        data-testid="venue-editor-food-ordering-discount"
      />
      <FoodTaxFields control={control} t={t} prefix="food_ordering" idPrefix="venue-editor-food" />
    </Stack>
  );
}
