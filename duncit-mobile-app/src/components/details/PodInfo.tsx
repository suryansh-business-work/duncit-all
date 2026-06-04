import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import { useThemeColors } from '@/hooks/useThemeColors';
import { podDateLabel, podPlaceLabel, podPriceLabel } from '@/utils/pod-format';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function Chip({ icon, label, primary }: { icon: IconName; label: string; primary?: boolean }) {
  return (
    <XStack
      alignItems="center"
      gap={5}
      borderRadius={999}
      paddingHorizontal={11}
      paddingVertical={6}
      backgroundColor={primary ? '$primary' : '$surface'}
      borderWidth={1}
      borderColor={primary ? '$primary' : '$borderColor'}
    >
      <MaterialIcons name={icon} size={14} color={primary ? '#ffffff' : '#9aa0aa'} />
      <Text fontSize={12} fontWeight="800" color={primary ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** Pod overview — title, key chips, host/place and the quick-stats row (spots
 * left · views · likes · comments). The detailed sections live in PodAccordions. */
export function PodInfo({ pod }: { pod: PodDetail }) {
  const { primary, muted } = useThemeColors();
  const host = pod.host_names.join(', ');
  const place = podPlaceLabel(pod) || pod.zone_name || '';
  const attendees = pod.pod_attendees.length;
  const remaining = pod.no_of_spots > 0 ? Math.max(pod.no_of_spots - attendees, 0) : null;

  return (
    <YStack padding={16} gap={14}>
      <Text fontSize={23} fontWeight="900" color="$color">
        {pod.pod_title}
      </Text>
      <XStack gap={8} flexWrap="wrap">
        <Chip icon="event" label={podDateLabel(pod)} />
        <Chip icon="payments" label={podPriceLabel(pod)} primary />
        <Chip
          icon="group"
          label={`${attendees}${pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''} going`}
        />
      </XStack>
      {host ? (
        <XStack alignItems="center" gap={8}>
          <MaterialIcons name="record-voice-over" size={18} color={primary} />
          <Text fontSize={14} fontWeight="700" color="$color">
            Hosted by {host}
          </Text>
        </XStack>
      ) : null}
      {place ? (
        <XStack alignItems="center" gap={8}>
          <MaterialIcons name="place" size={18} color={muted} />
          <Text flex={1} fontSize={14} color="$muted">
            {place}
          </Text>
        </XStack>
      ) : null}
      <XStack gap={8} flexWrap="wrap">
        {remaining !== null ? (
          <Chip icon="confirmation-number" label={`${remaining} spots left`} />
        ) : null}
        <Chip icon="visibility" label={`${pod.pod_hits ?? 0} views`} />
        <Chip icon="favorite" label={`${pod.like_count} likes`} />
        <Chip icon="chat-bubble-outline" label={`${pod.comment_count} comments`} />
      </XStack>
    </YStack>
  );
}
