import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { VenueApprovalChip } from '@/utils/venue-approval';

interface Props {
  id: string;
  title: string;
  when: string;
  zoneName?: string | null;
  typeLabel: string;
  /** Venue-approval chip meta (computed once by the section — rule 26g). */
  approval: VenueApprovalChip | null;
  /** Rejection note shown under a Venue Rejected pod. */
  rejectedNote: string | null;
  onOpen: () => void;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** One hosted pod row — open the pod + the host's Complete/Edit/Delete actions.
 * A venue-rejected pod also shows its status chip + the resubmission note. */
export function HostPodRow({
  id,
  title,
  when,
  zoneName,
  typeLabel,
  approval,
  rejectedNote,
  onOpen,
  onComplete,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const { color: ink, danger, primary } = useThemeColors();
  return (
    <YStack
      gap={8}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="center" gap={8}>
        <YStack
          testID={`host-pod-open-${id}`}
          role="button"
          aria-label="Open pod"
          onPress={onOpen}
          flex={1}
          pressStyle={{ opacity: 0.8 }}
        >
          <Text fontSize={14.5} fontWeight="800" color="$color" numberOfLines={1}>
            {title}
          </Text>
          {approval ? (
            <Text
              testID={`host-pod-approval-${id}`}
              fontSize={11.5}
              fontWeight="900"
              color={approval.tone === 'error' ? '$danger' : semantic.warning}
              numberOfLines={1}
            >
              {approval.label}
            </Text>
          ) : null}
          <Text fontSize={12} color="$muted" numberOfLines={1}>
            {when}
            {zoneName ? ` · ${zoneName}` : ''} · {typeLabel}
          </Text>
        </YStack>
        <XStack
          testID={`host-pod-complete-${id}`}
          role="button"
          aria-label="Complete pod"
          onPress={onComplete}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="task-alt" size={18} color={primary} />
        </XStack>
        <XStack
          testID={`host-pod-edit-${id}`}
          role="button"
          aria-label="Edit pod"
          onPress={onEdit}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="edit" size={18} color={ink} />
        </XStack>
        <XStack
          testID={`host-pod-delete-${id}`}
          role="button"
          aria-label="Delete pod"
          onPress={onDelete}
          width={40}
          height={40}
          alignItems="center"
          justifyContent="center"
          borderRadius={10}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons name="delete-outline" size={18} color={danger} />
        </XStack>
      </XStack>
      {rejectedNote ? (
        <XStack testID={`host-pod-rejected-note-${id}`} alignItems="flex-start" gap={6}>
          <MaterialIcons name="info-outline" size={16} color={semantic.warning} />
          <Text flex={1} fontSize={12} color="$muted">
            {rejectedNote}
          </Text>
        </XStack>
      ) : null}
    </YStack>
  );
}
