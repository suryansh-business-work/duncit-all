import { Text, XStack, YStack } from 'tamagui';

import { PodThumb } from '@/components/host-manage/PodThumb';
import {
  ApprovalPill,
  OverflowButton,
  TypePill,
  WarningNote,
} from '@/components/host-manage/HostRowParts';
import type { VenueApprovalChip } from '@/utils/venue-approval';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  id: string;
  title: string;
  when: string;
  zoneName?: string | null;
  typeLabel: string;
  /** Free pods wear the success-toned pill, paid ones the primary one. */
  free?: boolean;
  /** The pod's first still, or undefined for the glyph placeholder. */
  cover?: string;
  /** Venue-approval chip meta (computed once by the section — rule 26g). */
  approval: VenueApprovalChip | null;
  /** Rejection note shown under a Venue Rejected pod. */
  rejectedNote: string | null;
  onOpen: () => void;
  /** Opens the actions sheet — every per-pod action now lives behind it. */
  onActions: () => void;
}

/** One hosted pod row inside the Your-pods card — cover, title, when/where, the
 * Paid/Free pill and the actions sheet. A venue-rejected pod also shows its
 * status chip + the resubmission note. mWeb twin: host-manage-page/HostPodRow. */
export function HostPodRow({
  id,
  title,
  when,
  zoneName,
  typeLabel,
  free = false,
  cover,
  approval,
  rejectedNote,
  onOpen,
  onActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={10} paddingHorizontal={16} paddingVertical={14}>
      <XStack alignItems="center" gap={8}>
        <XStack
          testID={`host-pod-open-${id}`}
          role="button"
          aria-label={t('mweb.common.openPod')}
          onPress={onOpen}
          flex={1}
          alignItems="center"
          gap={12}
          pressStyle={PRESS_STYLE.row}
        >
          <PodThumb uri={cover} />
          <YStack flex={1} gap={2}>
            <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
              {title}
            </Text>
            <Text fontSize={12} color="$muted" numberOfLines={1}>
              {when}
              {zoneName ? ` · ${zoneName}` : ''}
            </Text>
            {approval ? (
              <YStack paddingTop={4}>
                <ApprovalPill approval={approval} testID={`host-pod-approval-${id}`} />
              </YStack>
            ) : null}
          </YStack>
        </XStack>
        <TypePill label={typeLabel} free={free} />
        <OverflowButton
          testID={`host-pod-actions-${id}`}
          label={`Actions for ${title}`}
          onPress={onActions}
        />
      </XStack>
      {rejectedNote ? (
        <WarningNote testID={`host-pod-rejected-note-${id}`} text={rejectedNote} />
      ) : null}
    </YStack>
  );
}
