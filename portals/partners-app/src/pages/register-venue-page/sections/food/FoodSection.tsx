import { Controller, type UseFormReturn } from 'react-hook-form';
import { Alert, AlertTitle, Divider, FormControlLabel, FormHelperText, Stack, Switch } from '@mui/material';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
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
 * The Food Menu registration section: the switch, then — while it is on — the
 * menu and, under it, online ordering. Stays editable after approval. Switching it off keeps
 * the menu for later; the server stops taking orders.
 */
export default function FoodSection({ form, config }: Readonly<Props>) {
  const { t } = useTranslation();
  const offersFood = form.watch('offers_food');

  return (
    <Stack spacing={2.5} data-testid="register-venue-food">
      <Alert severity="info" icon={<RestaurantMenuIcon />}>
        <AlertTitle component="h2" sx={{ fontWeight: 800 }}>
          {t('partners.registerVenuePage.foodSection')}
        </AlertTitle>
        {t('partners.registerVenuePage.foodSectionIntro')}
      </Alert>
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
