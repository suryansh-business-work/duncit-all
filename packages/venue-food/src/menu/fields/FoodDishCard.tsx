import { Controller, useWatch, type FieldValues } from 'react-hook-form';
import { FormControlLabel, MenuItem, Paper, Stack, Switch, Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useTranslation } from '@duncit/app-settings';
import { DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { foodDietLabel, foodSpiceLabel, type FoodMenuConfig } from '@duncit/utils';
import FoodDishPhotos, { type FoodPhotoUpload } from './FoodDishPhotos';
import { dishPath, type FoodControlProps } from './food-paths';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  index: number;
  config: FoodMenuConfig;
  upload: FoodPhotoUpload;
  idPrefix: string;
  onRemove: () => void;
}

const imagesOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((url): url is string => typeof url === 'string') : [];

/** One dish of the menu: what it is, what it costs, how it is cooked, whether it is served today, its photos. */
export default function FoodDishCard<T extends FieldValues, TOut = T>({
  control,
  index,
  config,
  upload,
  idPrefix,
  onRemove,
}: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const watchedName: unknown = useWatch({ control, name: dishPath<T>(index, 'name') });
  const dishName = typeof watchedName === 'string' ? watchedName : '';
  const heading = dishName.trim() || t('venueFoodOwner.menu.dishNumber', { vars: { n: index + 1 } });

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }} data-testid={`${idPrefix}-food-item-${index}`}>
      <Stack spacing={1}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" component="h4" sx={{ fontWeight: 800, overflowWrap: 'anywhere' }}>
            {heading}
          </Typography>
          <DuncitIconButton
            size="small"
            aria-label={t('venueFoodOwner.menu.removeDish', { vars: { name: heading } })}
            onClick={onRemove}
          >
            <DeleteIcon />
          </DuncitIconButton>
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <RhfTextField
            control={control}
            name={dishPath<T>(index, 'name')}
            label={t('venueFoodOwner.menu.name')}
            required
            size="small"
          />
          <RhfTextField
            control={control}
            name={dishPath<T>(index, 'category')}
            label={t('venueFoodOwner.menu.category')}
            hint={t('venueFoodOwner.menu.categoryHint')}
            size="small"
          />
        </Stack>
        <RhfTextField
          control={control}
          name={dishPath<T>(index, 'description')}
          label={t('venueFoodOwner.common.description')}
          multiline
          minRows={2}
          size="small"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <RhfTextField
            control={control}
            name={dishPath<T>(index, 'price')}
            label={t('venueFoodOwner.menu.price')}
            type="number"
            required
            size="small"
            slotProps={{ htmlInput: { min: 1, max: config.food_price_max, step: 'any', inputMode: 'decimal' } }}
          />
          <RhfTextField control={control} name={dishPath<T>(index, 'diet')} label={t('venueFoodOwner.menu.diet')} select size="small">
            {config.food_diets.map((diet) => (
              <MenuItem key={diet} value={diet}>
                {foodDietLabel(t, diet)}
              </MenuItem>
            ))}
          </RhfTextField>
          <RhfTextField
            control={control}
            name={dishPath<T>(index, 'spice_level')}
            label={t('venueFoodOwner.menu.spiceLevel')}
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
          name={dishPath<T>(index, 'images')}
          control={control}
          render={({ field, fieldState }) => (
            <FoodDishPhotos
              images={imagesOf(field.value)}
              limit={config.food_image_limit}
              dishName={dishName}
              error={fieldState.error?.message}
              onChange={(images) => field.onChange(images)}
              {...upload}
            />
          )}
        />
        <Controller
          name={dishPath<T>(index, 'is_available')}
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value === true}
                  onChange={(_, checked) => field.onChange(checked)}
                  onBlur={field.onBlur}
                  data-testid={`${idPrefix}-food-item-${index}-available`}
                />
              }
              label={t('venueFoodOwner.menu.available')}
            />
          )}
        />
      </Stack>
    </Paper>
  );
}
