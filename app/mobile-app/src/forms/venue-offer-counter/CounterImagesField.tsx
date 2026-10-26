import { useController, type Control } from 'react-hook-form';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { VENUE_OFFER_IMAGES_MAX } from '@duncit/forms/schemas';

import { FieldLabel } from '@/components/Field';
import { OfferImages } from '@/components/venue-offer/OfferImages';
import { useOfferPhotos } from '@/hooks/useOfferPhotos';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import type { CounterOfferValues } from './counter-offer.types';

/** One attached photo's remove control, under its thumbnail. */
function RemovePhoto({ index, onRemove }: Readonly<{ index: number; onRemove: () => void }>) {
  const { t } = useTranslation();
  const { danger } = useThemeColors();
  return (
    <XStack
      testID={`venue-offer-counter-image-remove-${index}`}
      role="button"
      tabIndex={0}
      hitSlop={6}
      aria-label={t('availability.offers.images.remove', { vars: { n: index + 1 } })}
      onPress={onRemove}
      width={64}
      justifyContent="center"
      paddingVertical={2}
      pressStyle={PRESS_STYLE.inline}
    >
      <MaterialIcons name="delete-outline" size={18} color={danger} />
    </XStack>
  );
}

/**
 * "Photos (optional)" on a counter: up to four, picked from the device and
 * uploaded as they are chosen — thumbnails that open full screen, each with a
 * remove control, and an add tile until the four are there. The hint names
 * the limit; an upload or access failure, or the schema's limit, replaces it.
 */
export function CounterImagesField({
  control,
}: Readonly<{ control: Control<CounterOfferValues> }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const { field, fieldState } = useController({ control, name: 'images' });
  const images = field.value;
  const photos = useOfferPhotos(images, field.onChange);
  const message = photos.error ?? fieldState.error?.message;

  return (
    <YStack gap={8} testID="venue-offer-counter-images">
      <FieldLabel label={t('availability.offers.images.label')} />
      <OfferImages images={images} testID="venue-offer-counter-image" />
      {images.length > 0 ? (
        <XStack gap={8} flexWrap="wrap">
          {images.map((url, index) => (
            <RemovePhoto
              key={url}
              index={index}
              onRemove={() => field.onChange(images.filter((_, at) => at !== index))}
            />
          ))}
        </XStack>
      ) : null}
      {photos.full ? null : (
        <XStack
          testID="venue-offer-counter-image-add"
          role="button"
          tabIndex={0}
          aria-label={t('availability.offers.images.add')}
          aria-disabled={photos.uploading}
          onPress={photos.uploading ? undefined : () => fireAndForget(photos.add())}
          alignSelf="flex-start"
          alignItems="center"
          gap={6}
          minHeight={40}
          paddingHorizontal={14}
          borderRadius={999}
          borderWidth={1}
          borderColor="$primary"
          pressStyle={PRESS_STYLE.control}
        >
          {photos.uploading ? (
            <Spinner size="small" color="$primary" />
          ) : (
            <MaterialIcons name="add-photo-alternate" size={18} color={accent} />
          )}
          <Text fontSize={13} fontWeight="600" color="$accent">
            {t('availability.offers.images.add')}
          </Text>
        </XStack>
      )}
      <Text
        testID="venue-offer-counter-images-hint"
        role={message ? 'alert' : undefined}
        fontSize={12}
        color={message ? '$danger' : '$muted'}
      >
        {message ?? t('availability.offers.images.hint', { vars: { max: VENUE_OFFER_IMAGES_MAX } })}
      </Text>
    </YStack>
  );
}
