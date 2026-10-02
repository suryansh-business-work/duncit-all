import { AppImage } from '@/components/AppImage';
import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';
import { isVideoUrl } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** The picked media as removable thumbnails — a video shows its icon. */
export function MediaThumbs({
  urls,
  muted,
  onRemove,
}: Readonly<{ urls: string[]; muted: string; onRemove: (url: string) => void }>) {
  const { t } = useTranslation();
  return (
    <XStack gap={8} flexWrap="wrap">
      {urls.map((url) => (
        <YStack
          key={url}
          testID={`media-thumb-${url}`}
          width={84}
          height={84}
          borderRadius={16}
          overflow="hidden"
          backgroundColor="$soft"
          alignItems="center"
          justifyContent="center"
        >
          {isVideoUrl(url) ? (
            <MaterialIcons name="videocam" size={26} color={muted} />
          ) : (
            <AppImage source={{ uri: url }} style={{ width: 84, height: 84 }} />
          )}
          <XStack
            testID={`media-remove-${url}`}
            tabIndex={0}
            hitSlop={11}
            role="button"
            aria-label={t('mweb.createPod.removeMedia')}
            onPress={() => onRemove(url)}
            position="absolute"
            top={2}
            right={2}
            width={22}
            height={22}
            alignItems="center"
            justifyContent="center"
            borderRadius={11}
            backgroundColor="rgba(0,0,0,0.55)"
            pressStyle={PRESS_STYLE.control}
          >
            <MaterialIcons name="close" size={14} color="#ffffff" />
          </XStack>
        </YStack>
      ))}
    </XStack>
  );
}
