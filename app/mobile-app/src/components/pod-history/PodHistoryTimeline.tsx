import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';
import {
  buildPodParticipationTimeline,
  participationInputFrom,
  timelineCopy,
  type PodTimelineNode,
  type TimelineCopy,
} from '@duncit/utils';

import type { PodMembership } from '@/utils/pod-history';
import { formatDateTime } from '@/utils/date-format';
import { useTranslation } from '@/hooks/useTranslation';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const TONE: Record<TimelineCopy['tone'], { name: IconName; color: string }> = {
  good: { name: 'check-circle', color: semantic.success },
  bad: { name: 'cancel', color: semantic.error },
  warn: { name: 'undo', color: semantic.warning },
  info: { name: 'hourglass-top', color: semantic.info },
};

/**
 * One node and everything under it.
 *
 * Hoisted and recursive because the workflow branches: a backout leads to the
 * spot being filled or not, and each of those leads somewhere else again. A
 * flat list can show the same events but not which followed from which, and
 * "why was I not refunded" is a question only the shape answers.
 */
function TimelineNode({ node, depth }: Readonly<{ node: PodTimelineNode; depth: number }>) {
  const { t } = useTranslation();
  const copy = timelineCopy(node, t);
  const icon = TONE[copy.tone];
  const children = node.children ?? [];

  return (
    <YStack paddingLeft={depth === 0 ? 0 : 18}>
      <XStack gap={10} alignItems="flex-start" paddingVertical={5}>
        {/* The rail into a nested branch — what makes "this followed from that"
            visible without a second column. */}
        {depth > 0 ? (
          <YStack width={2} alignSelf="stretch" backgroundColor="$borderColor" marginRight={4} />
        ) : null}
        <MaterialIcons name={icon.name} size={20} color={icon.color} />
        <YStack flex={1}>
          <XStack alignItems="center" gap={8} flexWrap="wrap">
            <Text fontSize={14} fontWeight="700" color="$color">
              {copy.title}
            </Text>
            {node.state === 'current' ? (
              <XStack
                borderRadius={999}
                paddingHorizontal={8}
                paddingVertical={2}
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Text fontSize={10} fontWeight="600" color="$color">
                  In progress
                </Text>
              </XStack>
            ) : null}
            {/* The id is the whole point of the mapping: this line and the row on
                Finance's User Backout Refunds page are the same request. */}
            {node.backoutNo && node.kind === 'BACKOUT_REQUESTED' ? (
              <XStack
                borderRadius={999}
                paddingHorizontal={8}
                paddingVertical={2}
                borderWidth={1}
                borderColor="$borderColor"
              >
                <Text fontSize={10} fontWeight="600" color="$colorSubtle">
                  {node.backoutNo}
                </Text>
              </XStack>
            ) : null}
          </XStack>
          {node.at ? (
            <Text fontSize={11} color="$muted">
              {formatDateTime(node.at)}
            </Text>
          ) : null}
          <Text fontSize={13} color="$muted">
            {copy.detail}
          </Text>
        </YStack>
      </XStack>
      {children.map((child, index) => (
        <TimelineNode
          key={`${child.kind}-${child.backoutNo ?? index}`}
          node={child}
          depth={depth + 1}
        />
      ))}
    </YStack>
  );
}

/**
 * What happened to this booking.
 *
 * Tamagui twin of mWeb's timeline: the nodes and the words both come from
 * @duncit/utils, so the two apps cannot start telling the same person different
 * stories about the same booking (rule 27).
 */
export function PodHistoryTimeline({ item }: Readonly<{ item: PodMembership }>) {
  const nodes = buildPodParticipationTimeline(
    participationInputFrom(item.participation, item.pod?.pod_date_time),
  );

  return (
    <YStack gap={2} testID="pod-history-timeline">
      {nodes.map((node, index) => (
        <TimelineNode key={`${node.kind}-${node.backoutNo ?? index}`} node={node} depth={0} />
      ))}
    </YStack>
  );
}
