import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import { buildTimeline, type PodMembership, type TimelineEvent } from '@/utils/pod-history';
import { formatDateTime } from '@/utils/date-format';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

function iconFor(event: TimelineEvent): { name: IconName; color: string } {
  if (event.state === 'current') return { name: 'hourglass-top', color: semantic.info };
  if (event.icon === 'backout') return { name: 'undo', color: semantic.warning };
  if (event.icon === 'refund') return { name: 'receipt-long', color: semantic.success };
  return { name: 'check-circle', color: semantic.success };
}

/** Vertical membership timeline — RN twin of mWeb's PodHistoryTimeline. */
export function PodHistoryTimeline({ item }: { item: PodMembership }) {
  const { primary } = useThemeColors();
  const events = buildTimeline(item);

  return (
    <YStack gap={2} testID="pod-history-timeline">
      {events.map((event, index) => {
        const icon = iconFor(event);
        const last = index === events.length - 1;
        return (
          <XStack key={`${event.title}-${index}`} gap={12} alignItems="flex-start">
            <YStack alignItems="center">
              <MaterialIcons name={icon.name} size={22} color={icon.color} />
              {!last ? (
                <YStack
                  width={2}
                  height={34}
                  marginVertical={4}
                  backgroundColor={event.state === 'current' ? '$borderColor' : primary}
                />
              ) : null}
            </YStack>
            <YStack flex={1} paddingBottom={last ? 0 : 6}>
              <XStack alignItems="center" gap={8} flexWrap="wrap">
                <Text fontSize={14} fontWeight="900" color="$color">
                  {event.title}
                </Text>
                <XStack
                  borderRadius={999}
                  paddingHorizontal={8}
                  paddingVertical={2}
                  backgroundColor={event.state === 'done' ? '$primary' : '$surface'}
                  borderWidth={event.state === 'done' ? 0 : 1}
                  borderColor="$borderColor"
                >
                  <Text
                    fontSize={10}
                    fontWeight="800"
                    color={event.state === 'done' ? '$onPrimary' : '$color'}
                  >
                    {event.tag}
                  </Text>
                </XStack>
              </XStack>
              {event.date ? (
                <Text fontSize={11} color="$muted">
                  {formatDateTime(event.date)}
                </Text>
              ) : null}
              <Text fontSize={13} color="$muted">
                {event.detail}
              </Text>
            </YStack>
          </XStack>
        );
      })}
    </YStack>
  );
}
