import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import { FormControlLabel, MenuItem, Paper, Stack, Switch, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { RegisterVenueValues, VenueRegistrationConfig } from '../../register-venue';
import FoodItemPhotos from './FoodItemPhotos';
import { foodDietLabel, foodSpiceLabel } from './food-labels';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  index: number;
  config: VenueRegistrationConfig;
  onRemove: () => void;
}

/** One dish of the menu: what it is, what it costs, how it is cooked, its photos. */
export default function FoodMenuItemCard({ form, index, config, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const { control } = form;
  const dishName = useWatch({ control, name: `food_menu.${index}.name` }) ?? '';
  const heading = dishName.trim() || t('partners.registerVenuePage.foodDishNumber', { vars: { n: index + 1 } });

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid={`register-venue-food-item-${index}`}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
            {heading}
          </Typography>
          <DuncitIconButton
            size="small"
            aria-label={t('partners.registerVenuePage.foodRemoveDish', { vars: { name: heading } })}
            onClick={onRemove}
          >
            <DeleteIcon />
          </DuncitIconButton>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.name`}
            label={t('partners.registerVenuePage.foodName')}
            required
            size="small"
          />
          <RhfTextField
            control={control}
            name={`food_menu.${index}.category`}
            label={t('partners.registerVenuePage.foodCategory')}
            hint={t('partners.registerVenuePage.foodCategoryHint')}
            size="small"
          />
        </Stack>
        <RhfTextField
          control={control}
          name={`food_menu.${index}.description`}
          label={t('partners.registerVenuePage.foodDescription')}
          multiline
          minRows={2}
          size="small"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.price`}
            label={t('partners.common.price')}
            type="number"
            required
            size="small"
            slotProps={{ htmlInput: { min: 1, max: config.food_price_max, step: 'any' } }}
          />
          <RhfTextField
            control={control}
            name={`food_menu.${index}.diet`}
            label={t('partners.registerVenuePage.foodType')}
            select
            size="small"
          >
            {config.food_diets.map((diet) => (
              <MenuItem key={diet} value={diet}>
                {foodDietLabel(t, diet)}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField
            control={control}
            name={`food_menu.${index}.spice_level`}
            label={t('partners.registerVenuePage.foodSpiceLevel')}
            select
            size="small"
          >
            {config.food_spice_levels.map((level) => (
              <MenuItem key={level} value={level}>
                {foodSpiceLabel(t, level)}
              </MenuItem>
            ))}
          </RhfTextField>
        </Stack>
        <Controller
          name={`food_menu.${index}.images`}
          control={control}
          render={({ field, fieldState }) => (
            <FoodItemPhotos
              images={field.value}
              limit={config.food_image_limit}
              dishName={dishName}
              error={fieldState.error?.message}
              onChange={(images) => field.onChange(images)}
            />
          )}
        />
        <Controller
          name={`food_menu.${index}.is_available`}
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch checked={field.value} onChange={(_, checked) => field.onChange(checked)} onBlur={field.onBlur} />
              }
              label={t('partners.registerVenuePage.foodAvailable')}
            />
          )}
        />
      </Stack>
    </Paper>
  );
}
