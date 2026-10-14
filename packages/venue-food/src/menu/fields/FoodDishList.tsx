import { get, useFieldArray, useFormState, type FieldValues } from 'react-hook-form';
import { Alert, FormHelperText, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { blankFoodDish, type FoodMenuConfig } from '@duncit/utils';
import FoodDishCard from './FoodDishCard';
import type { FoodPhotoUpload } from './FoodDishPhotos';
import { asDishRow, menuArrayPath, menuPath, type FoodControlProps } from './food-paths';

interface Props<T extends FieldValues, TOut> extends FoodControlProps<T, TOut> {
  config: FoodMenuConfig;
  upload: FoodPhotoUpload;
  idPrefix: string;
}

/** A list-level message (too many dishes) as react-hook-form files it on the array. */
const listMessage = (error: { message?: unknown; root?: { message?: unknown } } | undefined): string => {
  const text = error?.root?.message ?? error?.message;
  return typeof text === 'string' ? text : '';
};

/**
 * The venue's dishes, one card each, up to the config's limit. A dish removed
 * here is removed on save; one left in place goes back under the id it came
 * with, so every order that already names it keeps pointing at it.
 */
export default function FoodDishList<T extends FieldValues, TOut = T>({
  control,
  config,
  upload,
  idPrefix,
}: Readonly<Props<T, TOut>>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: menuArrayPath<T>() });
  const { errors } = useFormState({ control, name: menuPath<T>() });
  const error = listMessage(get(errors, 'food_menu'));
  const atLimit = fields.length >= config.food_menu_limit;

  return (
    <Stack spacing={1.5}>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
          {t('venueFoodOwner.menu.dishes')}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('venueFoodOwner.menu.dishesHint')}
        </Typography>
      </Stack>
      {error && (
        <FormHelperText error role="alert">
          {error}
        </FormHelperText>
      )}
      {fields.map((row, index) => (
        <FoodDishCard
          key={row.id}
          control={control}
          index={index}
          config={config}
          upload={upload}
          idPrefix={idPrefix}
          onRemove={() => remove(index)}
        />
      ))}
      {atLimit && (
        <Alert severity="info">{t('venueFoodOwner.menu.menuLimit', { vars: { max: config.food_menu_limit } })}</Alert>
      )}
      <DuncitButton
        startIcon={<AddIcon />}
        disabled={atLimit}
        onClick={() => append(asDishRow<T>(blankFoodDish(config)))}
        sx={{ alignSelf: 'flex-start' }}
        data-testid={`${idPrefix}-food-add`}
      >
        {t('venueFoodOwner.menu.addDish')}
      </DuncitButton>
    </Stack>
  );
}
