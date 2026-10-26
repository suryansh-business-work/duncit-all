import { useState } from 'react';
import { XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { AppImage } from '@/components/AppImage';
import { ImageViewerModal } from '@/components/ImageViewerModal';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  /** The photos attached to the terms, as uploaded. */
  images: readonly string[] | null | undefined;
  testID?: string;
}

/** A thumbnail's edge: four fit across the narrowest card. */
const THUMB = 64;

/**
 * The photos either side attached to its terms — the set-up, the menu — as
 * thumbnails; tapping one opens it full screen. Nothing when there are none.
 */
export function OfferImages({ images, testID = 'offer-images' }: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const photos = [...(images ?? [])];
  if (photos.length === 0) return null;

  return (
    <XStack testID={testID} gap={8} flexWrap="wrap">
      {photos.map((url, index) => (
        <XStack
          key={url}
          testID={`${testID}-${index}`}
          role="button"
          tabIndex={0}
          aria-label={t('availability.offers.images.open', { vars: { n: index + 1 } })}
          onPress={() => setOpen(index)}
          width={THUMB}
          height={THUMB}
          borderRadius={12}
          overflow="hidden"
          backgroundColor="$soft"
          pressStyle={PRESS_STYLE.control}
        >
          <AppImage
            source={{ uri: url }}
            accessibilityLabel={t('availability.offers.images.alt', { vars: { n: index + 1 } })}
            style={{ width: THUMB, height: THUMB }}
            resizeMode="cover"
          />
        </XStack>
      ))}
      <ImageViewerModal images={photos} index={open} onClose={() => setOpen(null)} />
    </XStack>
  );
}
