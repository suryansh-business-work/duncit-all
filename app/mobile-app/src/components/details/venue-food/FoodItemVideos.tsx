import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { venueVideosOf } from '@duncit/forms/schemas';
import type { VenueFoodItem } from '@duncit/utils';

import { DuncitDialog } from '@/components/DuncitDialog';
import { VenueVideoPlayer } from '@/components/details/VenueVideoPlayer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  item: Pick<VenueFoodItem, 'id' | 'name' | 'videos'>;
}

/**
 * A dish's videos behind a "Watch video" chip on its card — a sheet plays
 * them (YouTube or an uploaded clip), so nothing loads until the guest asks.
 * Tamagui twin of mWeb's food/FoodItemVideos.
 */
export function FoodItemVideos({ item }: Readonly<Props>) {
  const { t } = useTranslation();
  const { color } = useThemeColors();
  const [open, setOpen] = useState(false);
  const videos = venueVideosOf(item.videos);
  if (videos.length === 0) return null;

  return (
    <>
      <XStack
        testID={`food-item-videos-${item.id}`}
        role="button"
        tabIndex={0}
        aria-label={t('mweb.venueFood.watchVideo')}
        pressStyle={PRESS_STYLE.surface}
        onPress={() => setOpen(true)}
        alignSelf="flex-start"
        alignItems="center"
        gap={4}
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        paddingHorizontal={10}
        paddingVertical={4}
      >
        <MaterialIcons name="play-circle-outline" size={16} color={color} />
        <Text fontSize={12} fontWeight="600" color="$color">
          {t('mweb.venueFood.watchVideo')}
        </Text>
      </XStack>
      <DuncitDialog
        open={open}
        onClose={() => setOpen(false)}
        testID={`food-item-videos-sheet-${item.id}`}
        title={item.name}
        closeLabel={t('mweb.common.close')}
      >
        <YStack gap={16}>
          {open
            ? videos.map((video, index) => (
                <VenueVideoPlayer
                  key={video.url}
                  video={video}
                  title={t('mweb.venueFood.videoTitle', {
                    vars: { n: index + 1, name: item.name },
                  })}
                  testID={`food-item-video-${item.id}-${index}`}
                />
              ))
            : null}
        </YStack>
      </DuncitDialog>
    </>
  );
}
