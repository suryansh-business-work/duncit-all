import { Controller, useFormState, useWatch, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { foodDietLabel, type FoodMenuConfig, type FoodMenuFormValues } from '@duncit/utils';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { FoodItemPrice } from '@/components/details/venue-food/FoodItemPrice';
import { splitLines } from '@/components/create-pod/MediaUploadField/mediaUploadHelpers';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';

/** Where a dish photo is filed — the venues media folder, as on the web. */
const FOOD_PHOTO_FOLDER = '/venues';

interface Props {
  control: Control<FoodMenuFormValues>;
  index: number;
  config: FoodMenuConfig;
  /** Finance's currency symbol — the price preview is shown in it. */
  currency: string;
  onEdit: () => void;
  onRemove: () => void;
}

/**
 * One dish on the menu screen: its name, price (with any struck-through MRP and
 * its saving, as guests will see it) and food type at a glance, the
 * "available today" switch, its photos (the app's own picker and upload), and
 * the way into its details or off the menu.
 */
export function FoodDishCard({
  control,
  index,
  config,
  currency,
  onEdit,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const dish = useWatch({ control, name: `food_menu.${index}` });
  const heading =
    dish.name.trim() || t('venueFoodOwner.menu.dishNumber', { vars: { n: index + 1 } });
  const { errors } = useFormState({ control, name: `food_menu.${index}` });
  const dishError = errors.food_menu?.[index];
  const problem =
    dishError?.name?.message ??
    dishError?.price?.message ??
    dishError?.description?.message ??
    dishError?.category?.message;

  return (
    <SurfaceCard testID={`food-dish-${index}`} gap={10}>
      <XStack justifyContent="space-between" alignItems="center" gap={8}>
        <YStack flex={1} gap={2}>
          <Text fontSize={15} fontWeight="700" color="$color" numberOfLines={2}>
            {heading}
          </Text>
          <Text fontSize={12} color="$muted">
            {[dish.diet ? foodDietLabel(t, dish.diet) : '', dish.category]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <FoodItemPrice
            item={{ ...dish, id: `dish-${index}` }}
            currency={currency}
            audience="owner"
          />
        </YStack>
      </XStack>
      {problem ? (
        <Text role="alert" fontSize={12} color="$danger" testID={`food-dish-${index}-error`}>
          {problem}
        </Text>
      ) : null}
      <Controller
        control={control}
        name={`food_menu.${index}.is_available`}
        render={({ field }) => (
          <ToggleRow
            testID={`food-dish-${index}-available`}
            label={t('venueFoodOwner.menu.available')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name={`food_menu.${index}.images`}
        render={({ field, fieldState }) => (
          <MediaUploadField
            label={t('venueFoodOwner.menu.photos', {
              vars: { used: field.value.length, max: config.food_image_limit },
            })}
            value={field.value.join('\n')}
            onChange={(text) => field.onChange(splitLines(text))}
            error={fieldState.error?.message}
            folder={FOOD_PHOTO_FOLDER}
            maxImages={config.food_image_limit}
            pickerTitle={t('venueFoodOwner.menu.addPhotoFor', { vars: { name: heading } })}
          />
        )}
      />
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID={`food-dish-${index}-edit`}
          label={t('venueFoodOwner.common.edit')}
          accessibilityLabel={t('venueFoodOwner.common.editNamed', { vars: { name: heading } })}
          variant="ghost"
          size="sm"
          onPress={onEdit}
        />
        <DuncitButton
          testID={`food-dish-${index}-remove`}
          label={t('venueFoodOwner.common.delete')}
          accessibilityLabel={t('venueFoodOwner.common.deleteNamed', { vars: { name: heading } })}
          variant="ghost"
          tone="danger"
          size="sm"
          onPress={onRemove}
        />
      </XStack>
    </SurfaceCard>
  );
}
