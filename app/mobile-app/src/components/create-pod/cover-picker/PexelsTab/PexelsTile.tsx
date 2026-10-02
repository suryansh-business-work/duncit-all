import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import type { PexelsPhoto } from '../usePexelsPhotos';

const TILE = 104;

interface PexelsTileProps {
  photo: PexelsPhoto;
  id: string;
  picked: boolean;
  /** Full tray, or another photo importing — the tile stops responding. */
  frozen: boolean;
  importing: boolean;
  primary: string;
  onOpen: (photo: PexelsPhoto) => void;
}

/** One stock-photo thumbnail: opens the preview, ticks once picked. */
export function PexelsTile({
  photo,
  id,
  picked,
  frozen,
  importing,
  primary,
  onOpen,
}: Readonly<PexelsTileProps>) {
  const { t } = useTranslation();
  return (
    <YStack
      testID={`cover-pexels-${id}`}
      tabIndex={0}
      role="button"
      aria-label={
        photo.alt || t('mweb.createPod.photoBy', { vars: { name: photo.photographer ?? 'Pexels' } })
      }
      aria-disabled={frozen}
      onPress={frozen ? undefined : () => onOpen(photo)}
      width={TILE}
      height={TILE}
      borderRadius={16}
      overflow="hidden"
      borderWidth={picked ? 2 : 1}
      borderColor={picked ? '$primary' : '$borderColor'}
      backgroundColor={photo.avg_color ?? '$surface'}
      opacity={frozen ? 0.45 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <AppImage
        source={{ uri: photo.src_medium ?? photo.src_tiny ?? '' }}
        style={{ width: TILE, height: TILE }}
      />
      {importing ? (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          backgroundColor="rgba(0,0,0,0.35)"
        >
          <Spinner color="#ffffff" />
        </YStack>
      ) : null}
      {picked ? (
        <YStack position="absolute" top={4} right={4}>
          <MaterialIcons name="check-circle" size={20} color={primary} />
        </YStack>
      ) : null}
    </YStack>
  );
}
