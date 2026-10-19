import { Controller, useWatch, type Control } from 'react-hook-form';
import { Text, XStack } from 'tamagui';
import {
  rentalCategoryLabels,
  rentalUnitKey,
  type RentalItemsConfig,
  type RentalItemsValues,
} from '@duncit/utils';

import { MediaUploadField } from '@/components/create-pod/MediaUploadField/MediaUploadField';
import { splitLines } from '@/components/create-pod/MediaUploadField/mediaUploadHelpers';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';

/** Where an item's photos are filed — the venue's media folder, as on the web. */
const RENTAL_PHOTO_FOLDER = '/venues';

interface Props {
  control: Control<RentalItemsValues>;
  index: number;
  config: RentalItemsConfig;
  onEdit: () => void;
  onRemove: () => void;
}

/** One rented item on the list: what it is and costs, its photos, whether it can be rented, and its edit and remove. */
export function RentalItemCard({ control, index, config, onEdit, onRemove }: Readonly<Props>) {
  const { t } = useTranslation();
  const item = useWatch({ control, name: `items.${index}` });
  const heading = item.name.trim() || t('venueRentals.items.itemTitle', { vars: { n: index + 1 } });
  const categories = rentalCategoryLabels(item.categories ?? []);
  return (
    <SurfaceCard gap={10} testID={`rental-item-${index}`}>
      <Text fontSize={15} fontWeight="700" color="$color">
        {heading}
      </Text>
      <Text fontSize={12.5} color="$muted">
        {t('venueRentals.items.cardSummary', {
          vars: { rate: item.rate, unit: t(rentalUnitKey(item.unit)), stock: item.stock },
        })}
      </Text>
      <Text
        fontSize={12.5}
        color={categories.length > 0 ? '$muted' : '$danger'}
        testID={`rental-item-${index}-category-summary`}
      >
        {categories.length > 0 ? categories.join(', ') : t('venueRentals.items.noCategories')}
      </Text>
      <Controller
        control={control}
        name={`items.${index}.images`}
        render={({ field, fieldState }) => (
          <MediaUploadField
            label={t('venueRentals.items.photos')}
            value={field.value.join('\n')}
            onChange={(text) => field.onChange(splitLines(text))}
            error={fieldState.error?.message}
            folder={RENTAL_PHOTO_FOLDER}
            maxImages={config.rental_image_limit}
            pickerTitle={t('venueRentals.items.photos')}
          />
        )}
      />
      <Controller
        control={control}
        name={`items.${index}.is_available`}
        render={({ field }) => (
          <ToggleRow
            testID={`rental-item-${index}-available`}
            label={t('venueRentals.items.available')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID={`rental-item-${index}-edit`}
          label={t('venueFoodOwner.common.edit')}
          accessibilityLabel={t('venueFoodOwner.common.editNamed', { vars: { name: heading } })}
          variant="ghost"
          size="sm"
          onPress={onEdit}
        />
        <DuncitButton
          testID={`rental-item-${index}-remove`}
          label={t('venueFoodOwner.common.delete')}
          accessibilityLabel={t('venueRentals.items.remove', { vars: { name: heading } })}
          variant="ghost"
          tone="danger"
          size="sm"
          onPress={onRemove}
        />
      </XStack>
    </SurfaceCard>
  );
}
