import { Controller, type UseFormReturn } from 'react-hook-form';
import { Divider, FormControlLabel, FormHelperText, Stack, Switch, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { RegisterVenueValues, VenueRegistrationConfig } from '../../register-venue';
import FoodMenuField from './FoodMenuField';
import FoodOrderingField from './FoodOrderingField';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
}

const OFFERS_FOOD_HINT_ID = 'register-venue-offers-food-hint';

/**
 * Food at the venue: the switch, then — while it is on — the menu and, under
 * it, online ordering. Stays editable after approval. Switching it off keeps
 * the menu for later; the server stops taking orders.
 */
export default function FoodSection({ form, config }: Readonly<Props>) {
  const { t } = useTranslation();
  const offersFood = form.watch('offers_food');

  return (
    <Stack spacing={2} data-testid="register-venue-food">
      <Divider flexItem />
      <Typography variant="subtitle2" component="h2" sx={{ fontWeight: 800 }}>
        {t('partners.registerVenuePage.food')}
      </Typography>
      <Stack spacing={0}>
        <Controller
          name="offers_food"
          control={form.control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(_, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  slotProps={{ input: { 'aria-describedby': OFFERS_FOOD_HINT_ID } }}
                  data-testid="register-venue-offers-food"
                />
              }
              label={t('partners.registerVenuePage.offersFood')}
            />
          )}
        />
        <FormHelperText id={OFFERS_FOOD_HINT_ID} sx={{ mt: 0 }}>
          {t('partners.registerVenuePage.offersFoodHint')}
        </FormHelperText>
      </Stack>
      {offersFood && (
        <>
          <FoodMenuField form={form} config={config} />
          <Divider flexItem />
          <FoodOrderingField form={form} config={config} />
        </>
      )}
    </Stack>
  );
}
