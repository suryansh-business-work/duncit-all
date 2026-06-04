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

function Section({
  title,
  items,
  icon,
  tint,
}: {
  title: string;
  items: string[];
  icon: IconName;
  tint: string;
}) {
  if (items.length === 0) return null;
  return (
    <YStack gap={8}>
      <Text fontSize={15} fontWeight="900" color="$color">
        {title}
      </Text>
      {items.map((item) => (
        <XStack key={item} alignItems="center" gap={8}>
          <MaterialIcons name={icon} size={16} color={tint} />
          <Text flex={1} fontSize={13.5} color="$color">
            {item}
          </Text>
        </XStack>
      ))}
    </YStack>
  );
}

/** The pod-details body — title, key chips, host/place, description and the
 * "what this pod offers" / perks lists. */
export function PodInfo({ pod }: { pod: PodDetail }) {
  const { primary, muted } = useThemeColors();
  const host = pod.host_names.join(', ');
  const place = podPlaceLabel(pod) || pod.zone_name || '';
  const attendees = pod.pod_attendees.length;
  const going = `${attendees}${pod.no_of_spots > 0 ? `/${pod.no_of_spots}` : ''} going`;

  return (
    <YStack padding={16} gap={14}>
      <Text fontSize={23} fontWeight="900" color="$color">
        {pod.pod_title}
      </Text>
      <XStack gap={8} flexWrap="wrap">
        <Chip icon="event" label={podDateLabel(pod)} />
        <Chip icon="payments" label={podPriceLabel(pod)} primary />
        <Chip icon="group" label={going} />
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
      {pod.pod_description ? (
        <Text fontSize={14} color="$color" lineHeight={20}>
          {pod.pod_description}
        </Text>
      ) : null}
      <Section
        title="What this pod offers"
        items={pod.what_this_pod_offers}
        icon="check-circle"
        tint={primary}
      />
      <Section title="Perks" items={pod.available_perks} icon="star" tint="#f5a623" />
    </YStack>
  );
}
