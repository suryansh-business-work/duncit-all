import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { coverImageUrl } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PodMembership } from '@/utils/pod-history';
import { formatDateTime } from '@/utils/date-format';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** A joined-pod row in the history list — one row of the list card, the
 * parent draws the hairlines between them. RN twin of mWeb's PodHistoryPage row. */
export function PodHistoryCard({
  item,
  onPress,
}: Readonly<{ item: PodMembership; onPress: () => void }>) {
  const { muted } = useThemeColors();
  const { t } = useTranslation();
  const image = coverImageUrl(item.pod?.pod_images_and_videos);
  const title = item.pod?.pod_title ?? t('mweb.podHistory.pod');

  return (
    <XStack
      testID={`pod-history-card-${item.id}`}
      role="button"
      aria-label={title}
      onPress={onPress}
      gap={12}
      paddingHorizontal={16}
      paddingVertical={14}
      alignItems="center"
      pressStyle={PRESS_STYLE.row}
    >
      <YStack
        width={48}
        height={48}
        borderRadius={12}
        overflow="hidden"
        backgroundColor="$soft"
        alignItems="center"
        justifyContent="center"
      >
        {image ? (
          <AppImage
            source={{ uri: image }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="history" size={22} color={muted} />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {title}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.podHistory.joinedOn', { vars: { date: formatDateTime(item.joined_at) } })}
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={22} color={muted} />
    </XStack>
  );
}
