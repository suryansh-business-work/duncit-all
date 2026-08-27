import { AppImage } from '@/components/AppImage';

import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  /** Every venue image, cover first — the grid renders all but the cover. */
  images: string[];
  /** Index into `images`, so the caller opens the viewer on the same list. */
  onOpen: (index: number) => void;
}

/** The venue's remaining photos as a tap-to-maximise grid. Tamagui twin of
 * mWeb's VenueImagesGrid. */
export function VenueImagesGrid({ images, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  if (images.length < 2) return null;

  return (
    <YStack gap={8}>
      <Text fontSize={15} fontWeight="700" color="$color">
        Images
      </Text>
      <XStack flexWrap="wrap" gap={8}>
        {images.slice(1).map((url, tileIndex) => (
          <XStack
            pressStyle={PRESS_STYLE.surface}
            key={url}
            testID="venue-gallery-image"
            role="button"
            aria-label={t('mweb.podDetails.viewImage')}
            onPress={() => onOpen(tileIndex + 1)}
            width="31%"
            aspectRatio={4 / 3}
            borderRadius={10}
            overflow="hidden"
          >
            <AppImage
              source={{ uri: url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </XStack>
        ))}
      </XStack>
    </YStack>
  );
}
