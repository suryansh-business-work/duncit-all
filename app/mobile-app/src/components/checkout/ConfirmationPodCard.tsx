import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { CheckoutPod } from '@/hooks/useCheckout';
import { coverImageUrl } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDateTime } from '@/utils/date-format';

/** Pod summary shown on the success screen — image + title + date + location, so
 * the native confirmation mirrors mWeb's pod box. */
export function ConfirmationPodCard({ pod }: Readonly<{ pod: CheckoutPod }>) {
  const { muted, accent } = useThemeColors();
  if (!pod) return null;
  const image = coverImageUrl(pod.pod_images_and_videos);

  return (
    <SurfaceCard testID="confirmation-pod" alignSelf="stretch" gap={10}>
      {image ? (
        <AppImage
          source={{ uri: image }}
          style={{ width: '100%', height: 132, borderRadius: 18 }}
          resizeMode="cover"
        />
      ) : null}
      <YStack gap={4}>
        <Text fontSize={16} fontWeight="600" color="$color">
          {pod.pod_title}
        </Text>
        {pod.pod_date_time ? (
          <XStack alignItems="center" gap={6}>
            <MaterialIcons name="event" size={15} color={accent} />
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
    </SurfaceCard>
  );
}
