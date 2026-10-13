import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import { Controller, useFormState, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import FoodMenuField from './FoodMenuField';
import type { VenueRegistrationConfig } from '../queries';
import type { VenueFormValues } from '../types';

/**
 * Whether the venue serves food, and — when it does — its menu.
 *
 * Switching this off does not empty the menu: the server keeps it for the day
 * the kitchen reopens, and itself turns QR ordering off. The dishes are still
 * validated while hidden, so a broken one says so here rather than blocking
 * Save from somewhere the admin cannot see.
 */
export default function OffersFoodField({
  control,
  config,
  onPick,
}: Readonly<{
  control: Control<VenueFormValues>;
  config: VenueRegistrationConfig;
  onPick: () => Promise<string | null>;
}>) {
  const { t } = useTranslation();
  const offersFood = useWatch({ control, name: 'offers_food' });
  const { errors } = useFormState({ control, name: 'food_menu' });

  return (
    <Stack spacing={1}>
      <Controller
        control={control}
        name="offers_food"
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={!!field.value} onChange={field.onChange} />}
            label={t('directory.venueEditor.offersFood')}
          />
        )}
      />
      {offersFood && <FoodMenuField control={control} config={config} onPick={onPick} />}
      {!offersFood && errors.food_menu && (
        <Typography variant="caption" role="alert" sx={{ color: 'error.main' }}>
          {t('directory.venueEditor.errHiddenMenu')}
        </Typography>
      )}
    </Stack>
  );
}
