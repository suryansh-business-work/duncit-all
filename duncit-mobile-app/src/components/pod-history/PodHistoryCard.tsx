import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PodMembership } from '@/utils/pod-history';
import { formatDateTime } from '@/utils/date-format';

/** A joined-pod row in the history list — RN twin of mWeb's PodHistoryPage card. */
export function PodHistoryCard({ item, onPress }: { item: PodMembership; onPress: () => void }) {
  const { muted, onPrimary } = useThemeColors();
  const image = item.pod?.pod_images_and_videos?.[0]?.url;

  return (
    <XStack
      testID={`pod-history-card-${item.id}`}
      role="button"
      aria-label={item.pod?.pod_title ?? 'Pod'}
      onPress={onPress}
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      alignItems="center"
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack
        width={48}
        height={48}
        borderRadius={24}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <MaterialIcons name="history" size={22} color={onPrimary} />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
          {item.pod?.pod_title ?? 'Pod'}
        </Text>
        <Text fontSize={12} color="$muted">
          Joined {formatDateTime(item.joined_at)}
        </Text>
      </YStack>
      <MaterialIcons name="arrow-forward" size={18} color={muted} />
    </XStack>
  );
}
