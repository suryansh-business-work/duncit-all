import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import {
  attendanceRowState,
  joinPhone,
  type AttendanceRowState,
  type PodAttendanceLabels,
  type PodAttendanceRow as AttendanceRowData,
} from '@duncit/utils';

import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

/** What the second line says — how they were marked, or how to reach them. */
function captionFor(
  row: AttendanceRowData,
  labels: PodAttendanceLabels,
  formatDateTime: (iso: string) => string,
): string {
  if (!row.attended) return joinPhone(row.phone_extension, row.phone_number) || row.email;
  const method = row.marked_method ? labels.methodLabel(row.marked_method) : '';
  const when = row.attended_at ? labels.markedAt(formatDateTime(row.attended_at)) : '';
  return [method, when].filter(Boolean).join(' · ');
}

/** The green "Marked" end-cap — a success pill. Hoisted (Sonar S6478). */
function MarkedBadge({ labels }: Readonly<{ labels: PodAttendanceLabels }>) {
  const { success } = useThemeColors();
  return (
    <XStack
      alignItems="center"
      gap={4}
      height={28}
      paddingHorizontal={10}
      borderRadius={999}
      backgroundColor="$successSoft"
    >
      <MaterialIcons name="check-circle" size={16} color={success} />
      <Text fontSize={12} fontWeight="600" color="$color">
        {labels.markedChip}
      </Text>
    </XStack>
  );
}

interface MarkButtonProps {
  row: AttendanceRowData;
  labels: PodAttendanceLabels;
  state: AttendanceRowState;
  busy: boolean;
  onMark: (row: AttendanceRowData) => void;
}

/** The per-attendee action. Dimmed, not hidden, when it cannot fire — a row
 * with no button reads as "nothing to do here", which is the opposite. */
function MarkButton({ row, labels, state, busy, onMark }: Readonly<MarkButtonProps>) {
  const { muted } = useThemeColors();
  const ready = state === 'READY' && !busy;
  return (
    <XStack alignItems="center" gap={6}>
      <MaterialIcons name="radio-button-unchecked" size={18} color={muted} />
      <XStack
        testID={`attendance-mark-${row.membership_id}`}
        role="button"
        aria-label={labels.markButton}
        onPress={() => ready && onMark(row)}
        alignItems="center"
        justifyContent="center"
        paddingHorizontal={14}
        height={36}
        borderRadius={999}
        backgroundColor={ready ? '$primary' : '$soft'}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={13} fontWeight="600" color={ready ? '$onPrimary' : '$muted'}>
          {busy ? labels.marking : labels.markButton}
        </Text>
      </XStack>
    </XStack>
  );
}

/** "×N" beside a name — one booking that admits several people. */
function SeatsPill({ label }: Readonly<{ label: string }>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      alignItems="center"
      gap={3}
      height={20}
      paddingHorizontal={6}
      borderRadius={999}
      backgroundColor="$soft"
    >
      <MaterialIcons name="group" size={12} color={muted} />
      <Text fontSize={11} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

interface Props {
  row: AttendanceRowData;
  labels: PodAttendanceLabels;
  canMark: boolean;
  busy: boolean;
  formatDateTime: (iso: string) => string;
  onMark: (row: AttendanceRowData) => void;
}

/**
 * One attendee — the Tamagui twin of the shared MUI row (rule 27).
 *
 * The whole row turns green when marked, not just an icon: the host is reading
 * a list at a door on a phone, and a tick the size of a full stop is exactly
 * the signal that got missed. The caption says HOW they were marked, because a
 * scan and a by-hand mark are not the same evidence.
 */
export function AttendanceRow({
  row,
  labels,
  canMark,
  busy,
  formatDateTime,
  onMark,
}: Readonly<Props>) {
  const state = attendanceRowState(row, canMark);
  const marked = state === 'MARKED';

  return (
    <XStack
      testID={`attendance-row-${row.membership_id}`}
      alignItems="center"
      gap={12}
      paddingVertical={12}
      paddingHorizontal={14}
      borderRadius={16}
      borderWidth={1}
      borderColor={marked ? '$success' : '$borderColor'}
      backgroundColor={marked ? '$successSoft' : '$surface'}
    >
      <AttendeeAvatar uri={row.avatar_url} name={row.name} size={36} />

      <YStack flex={1} gap={2}>
        <XStack alignItems="center" gap={6}>
          <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1} flexShrink={1}>
            {row.name}
          </Text>
          {row.seats > 1 ? <SeatsPill label={labels.seats(row.seats)} /> : null}
        </XStack>
        <Text fontSize={12.5} color="$muted" numberOfLines={1}>
          {captionFor(row, labels, formatDateTime)}
        </Text>
        {marked && row.verified_phone ? (
          <Text fontSize={12.5} color="$muted" numberOfLines={1}>
            {labels.verifiedPhone(row.verified_phone)}
          </Text>
        ) : null}
        {state === 'NEEDS_COMPANIONS' ? (
          <Text fontSize={12.5} color="$warning">
            {labels.companionsNeeded(row.companions_required)}
          </Text>
        ) : null}
      </YStack>

      {marked ? (
        <MarkedBadge labels={labels} />
      ) : (
        <MarkButton row={row} labels={labels} state={state} busy={busy} onMark={onMark} />
      )}
    </XStack>
  );
}
