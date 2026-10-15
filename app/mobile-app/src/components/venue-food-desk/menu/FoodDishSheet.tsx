import { Controller, type Control, type UseFormTrigger } from 'react-hook-form';
import { YStack } from 'tamagui';
import {
  FOOD_SAVING_DISPLAYS,
  foodDietLabel,
  foodSpiceLabel,
  type FoodMenuConfig,
  type FoodMenuFormValues,
} from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { DuncitDialog } from '@/components/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

import { FoodDishVideos } from './FoodDishVideos';

const SAVING_DISPLAY_KEYS: Record<(typeof FOOD_SAVING_DISPLAYS)[number], string> = {
  PERCENT: 'venueFoodOwner.menu.savingDisplayPercent',
  AMOUNT: 'venueFoodOwner.menu.savingDisplayAmount',
};

interface Props {
  control: Control<FoodMenuFormValues>;
  trigger: UseFormTrigger<FoodMenuFormValues>;
  /** The dish being edited — its row in the menu; null when closed. */
  index: number | null;
  config: FoodMenuConfig;
  /** Closes the sheet; `discard` is true for a dish added and then cancelled. */
  onClose: (discard: boolean) => void;
  /** A dish just added — Cancel then removes it rather than keeping a blank row. */
  isNew: boolean;
}

/**
 * One dish's details — name, menu section, description, price (and the
 * optional struck-through MRP), food type, spice level and videos — edited in
 * a sheet over the menu. The fields write straight into
 * the menu form; Done checks the dish against the shared rules
 * (`makeFoodMenuSchema`) before the sheet lets go. Photos and the "available"
 * switch sit on the dish's card, outside the sheet.
 */
export function FoodDishSheet({
  control,
  trigger,
  index,
  config,
  onClose,
  isNew,
}: Readonly<Props>) {
  const { t } = useTranslation();
  if (index === null) return null;
  const name = (field: 'name' | 'category' | 'description' | 'price' | 'original_price') =>
    `food_menu.${index}.${field}` as const;

  const done = async () => {
    if (await trigger(`food_menu.${index}`)) onClose(false);
  };

  return (
    <DuncitDialog
      open
      onClose={() => onClose(isNew)}
      testID="food-dish-sheet"
      title={t('venueFoodOwner.menu.dishNumber', { vars: { n: index + 1 } })}
      closeLabel={t('venueFoodOwner.common.cancel')}
      dismissOnBackdrop={false}
      footer={
        <ConfirmFooter
          cancelLabel={t('venueFoodOwner.common.cancel')}
          confirmLabel={t('venueFoodOwner.common.save')}
          busy={false}
          destructive={false}
          cancelTestID="food-dish-cancel"
          confirmTestID="food-dish-done"
          onCancel={() => onClose(isNew)}
          onConfirm={() => fireAndForget(done())}
        />
      }
    >
      <YStack gap={12}>
        <FormTextField
          control={control}
          name={name('name')}
          label={t('venueFoodOwner.menu.name')}
          required
        />
        <FormTextField
          control={control}
          name={name('category')}
          label={t('venueFoodOwner.menu.category')}
          hint={t('venueFoodOwner.menu.categoryHint')}
        />
        <FormTextField
          control={control}
          name={name('description')}
          label={t('venueFoodOwner.common.description')}
          multiline
        />
        <FormTextField
          control={control}
          name={name('price')}
          label={t('venueFoodOwner.menu.price')}
          keyboardType="decimal-pad"
          required
        />
        <FormTextField
          control={control}
          name={name('original_price')}
          label={t('venueFoodOwner.menu.originalPrice')}
          hint={t('venueFoodOwner.menu.originalPriceHint')}
          keyboardType="decimal-pad"
        />
        <Controller
          control={control}
          name={`food_menu.${index}.saving_display`}
          render={({ field, fieldState }) => (
            <ChipSelectField
              testID="food-dish-saving-display"
              label={t('venueFoodOwner.menu.savingDisplay')}
              options={FOOD_SAVING_DISPLAYS.map((mode) => ({
                value: mode,
                label: t(SAVING_DISPLAY_KEYS[mode]),
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name={`food_menu.${index}.diet`}
          render={({ field, fieldState }) => (
            <ChipSelectField
              testID="food-dish-diet"
              label={t('venueFoodOwner.menu.diet')}
              options={config.food_diets.map((diet) => ({
                value: diet,
                label: foodDietLabel(t, diet),
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name={`food_menu.${index}.spice_level`}
          render={({ field, fieldState }) => (
            <ChipSelectField
              testID="food-dish-spice"
              label={t('venueFoodOwner.menu.spiceLevel')}
              options={config.food_spice_levels.map((level) => ({
                value: level,
                label: foodSpiceLabel(t, level),
              }))}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name={`food_menu.${index}.videos`}
          render={({ field, fieldState }) => (
            <FoodDishVideos
              videos={field.value}
              onChange={field.onChange}
              limit={config.food_video_limit}
              testID="food-dish-videos"
              error={fieldState.error?.message}
            />
          )}
        />
      </YStack>
    </DuncitDialog>
  );
}
