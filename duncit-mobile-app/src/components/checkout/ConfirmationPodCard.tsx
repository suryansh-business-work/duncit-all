import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { CheckoutPod } from '@/hooks/useCheckout';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/utils/date-format';

/** Pod summary shown on the success screen — image + title + date + location, so
 * the native confirmation mirrors mWeb's pod box. */
export function ConfirmationPodCard({ pod }: Readonly<{ pod: CheckoutPod }>) {
  const { muted, primary } = useThemeColors();
  if (!pod) return null;
  const image = pod.pod_images_and_videos?.find((m) => m.url)?.url;

  return (
    <YStack
      testID="confirmation-pod"
      alignSelf="stretch"
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      overflow="hidden"
    >
      {image ? (
        <Image source={{ uri: image }} style={{ width: '100%', height: 132 }} resizeMode="cover" />
      ) : null}
      <YStack padding={14} gap={4}>
        <Text fontSize={11} fontWeight="800" textTransform="uppercase" color="$muted">
          Your booking
        </Text>
        <Text fontSize={16} fontWeight="900" color="$color">
          {pod.pod_title}
        </Text>
        {pod.pod_date_time ? (
          <XStack alignItems="center" gap={6}>
            <MaterialIcons name="event" size={15} color={primary} />
            <Text fontSize={13} color="$muted">
              {formatDateTime(pod.pod_date_time)}
            </Text>
          </XStack>
        ) : null}
        {pod.zone_name ? (
          <XStack alignItems="center" gap={6}>
            <MaterialIcons name="place" size={15} color={muted} />
            <Text fontSize={13} color="$muted">
              {pod.zone_name}
            </Text>
          </XStack>
        ) : null}
      </YStack>
    </YStack>
  );
}
