import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { PodDetail } from '@/hooks/useDetails';
import {
  podModeLabel,
  podOccurrenceLabel,
  podPriceLabel,
  podTimeChip,
  type TimeTone,
} from '@/utils/pod-format';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const TONE: Record<TimeTone, string> = {
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
};

function Chip({
  icon,
  label,
  primary,
  tone,
}: {
  icon?: IconName;
  label: string;
  primary?: boolean;
  tone?: string;
}) {
  const fg = primary ? '#ffffff' : (tone ?? '#9aa0aa');
  return (
    <XStack
      alignItems="center"
      gap={5}
      borderRadius={999}
      paddingHorizontal={11}
      paddingVertical={6}
      backgroundColor={primary ? '$primary' : tone ? `${tone}22` : '$surface'}
      borderWidth={1}
      borderColor={primary ? '$primary' : (tone ?? '$borderColor')}
    >
      {icon ? <MaterialIcons name={icon} size={14} color={fg} /> : null}
      <Text fontSize={12} fontWeight="800" color={primary ? '$onPrimary' : tone ? tone : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <YStack flex={1} padding={12} borderRadius={14} backgroundColor="$surface">
      <Text fontSize={12} color="$muted">
        {label}
      </Text>
      <Text fontSize={20} fontWeight="900" color="$color">
        {value}
      </Text>
    </YStack>
  );
}

/** Pod overview card — title, host, key chips (price · mode · occurrence ·
 * countdown), the People-in / Spots-left boxes and a quick-stats row. RN port of
 * mWeb's PodOverview + PodQuickStats. Detailed sections live in PodAccordions. */
export function PodInfo({ pod }: { pod: PodDetail }) {
  const host = pod.host_names.join(', ');
  const isVirtual = pod.pod_mode === 'VIRTUAL';
  const attendees = pod.pod_attendees.length;
  const hasSpots = pod.no_of_spots > 0;
  const remaining = hasSpots ? Math.max(pod.no_of_spots - attendees, 0) : 0;
  const time = podTimeChip(pod.pod_date_time);

  return (
    <YStack
      margin={16}
      padding={16}
      gap={14}
      borderRadius={18}
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={23} fontWeight="900" color="$color">
        {pod.pod_title}
      </Text>
      {host ? (
        <Text fontSize={13.5} color="$muted">
          Hosted by {host}
        </Text>
      ) : null}
      <XStack gap={8} flexWrap="wrap">
        <Chip label={podPriceLabel(pod)} primary />
        <Chip icon={isVirtual ? 'videocam' : 'place'} label={podModeLabel(pod.pod_mode)} />
        <Chip icon="repeat" label={podOccurrenceLabel(pod.pod_occurrence)} />
        {time ? (
          <Chip
            icon={time.tone === 'error' ? 'event-busy' : 'hourglass-bottom'}
            label={time.label}
            tone={TONE[time.tone]}
          />
        ) : null}
      </XStack>
      <XStack gap={10}>
        <StatBox label="People in" value={attendees} />
        <StatBox label="Spots left" value={remaining} />
      </XStack>
      <XStack gap={8} flexWrap="wrap">
        {hasSpots ? (
          <Chip
            icon="confirmation-number"
            label={`${remaining} spots left`}
            tone={remaining <= 3 ? TONE.warning : undefined}
          />
        ) : null}
        <Chip icon="visibility" label={`${pod.pod_hits ?? 0} views`} />
      </XStack>
    </YStack>
  );
}
