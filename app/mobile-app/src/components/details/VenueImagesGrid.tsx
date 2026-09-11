import { useWindowDimensions } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { XStack, YStack } from 'tamagui';

import { SectionHeader } from '@/components/SectionHeader';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const COLUMNS = 2;
const GAP = 8;
/** The venue screen's side padding, either side of the grid. */
const SIDE_PADDING = 16;

interface Props {
  /** Every venue image, cover first — the grid renders all but the cover. */
  images: string[];
  /** Index into `images`, so the caller opens the viewer on the same list. */
  onOpen: (index: number) => void;
}

/** The venue's remaining photos as a two-column tap-to-maximise grid. Tamagui
 * twin of mWeb's VenueImagesGrid. */
export function VenueImagesGrid({ images, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  if (images.length < 2) return null;
  const tileWidth = Math.floor((width - SIDE_PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  return (
    <YStack gap={10}>
      <SectionHeader title={t('mweb.venues.images')} />
      <XStack flexWrap="wrap" gap={GAP}>
        {images.slice(1).map((url, tileIndex) => (
          <XStack
            pressStyle={PRESS_STYLE.surface}
            key={url}
            testID="venue-gallery-image"
            role="button"
            aria-label={t('mweb.podDetails.viewImage')}
            onPress={() => onOpen(tileIndex + 1)}
            width={tileWidth}
            aspectRatio={4 / 3}
            borderRadius={18}
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
