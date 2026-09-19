import { useEffect, useMemo, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Input, Text, XStack, YStack } from 'tamagui';
import {
  joinPhone,
  matchAttendanceRows,
  type PodAttendanceLabels,
  type PodAttendanceRow,
} from '@duncit/utils';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { DuncitDialog } from '@/components/DuncitDialog';
import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { FIELD_HEIGHT, FIELD_RADIUS, Field } from '@/components/Field';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  open: boolean;
  rows: readonly PodAttendanceRow[];
  labels: PodAttendanceLabels;
  onClose: () => void;
  /** Hands the picked booking to the same warning a row's Mark opens. */
  onPick: (row: PodAttendanceRow) => void;
}

/** One search result. Hoisted to module scope (Sonar S6478). */
function DirectMarkResult({
  row,
  labels,
  onPick,
}: Readonly<{
  row: PodAttendanceRow;
  labels: PodAttendanceLabels;
  onPick: (row: PodAttendanceRow) => void;
}>) {
  const { muted, success } = useThemeColors();
  const detail = [
    joinPhone(row.phone_extension, row.phone_number),
    row.ticket_code,
    row.seats > 1 ? labels.seats(row.seats) : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <XStack
      testID={`attendance-direct-result-${row.membership_id}`}
      role="button"
      tabIndex={0}
      aria-label={row.name}
      aria-disabled={row.attended}
      accessibilityHint={detail}
      onPress={() => !row.attended && onPick(row)}
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor={row.attended ? '$success' : '$borderColor'}
      backgroundColor={row.attended ? '$successSoft' : '$surface'}
      alignItems="center"
      pressStyle={row.attended ? undefined : PRESS_STYLE.control}
    >
      <AttendeeAvatar uri={row.avatar_url} name={row.name} size={32} />
      <YStack flex={1} gap={2}>
        <Text fontSize={14.5} fontWeight="600" color="$color" numberOfLines={1}>
          {row.name}
        </Text>
        <Text fontSize={12.5} color="$muted" numberOfLines={1}>
          {detail}
        </Text>
      </YStack>
      {row.attended ? (
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name="check-circle" size={16} color={success} />
          <Text fontSize={12} fontWeight="600" color="$color">
            {labels.markedChip}
          </Text>
        </XStack>
      ) : (
        <MaterialIcons name="chevron-right" size={20} color={muted} />
      )}
    </XStack>
  );
}

/**
 * The Club Admin's by-name mark, as its own door — the Tamagui twin of the
 * shared MUI `DirectMarkDialog` (rule 27).
 *
 * The roster answers "who booked this pod". This answers the question an admin
 * is actually asked at the venue — "the host never scanned me, my name is X" —
 * and it is a separate question, because the person asking it is not looking
 * over the admin's shoulder at a list. Typing the name narrows the pod's
 * bookings to theirs; picking one hands off to the same warning a row's Mark
 * opens, so nothing is written from this sheet directly (rule 41).
 *
 * Already-marked bookings stay in the results, tinted green and inert:
 * "I cannot find them" and "somebody already marked them" are different
 * answers, and dropping the second reads as the first.
 */
export function DirectMarkSheet({ open, rows, labels, onClose, onPick }: Readonly<Props>) {
  const [query, setQuery] = useState('');

  // A fresh search every time it opens — the previous attendee's name left in
  // the box is the one thing that could put the next mark on the wrong person.
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);

  const results = useMemo(() => matchAttendanceRows(rows, query), [rows, query]);
  // Hoisted so the conditional sits at nesting 0 (Sonar S3358). A pod nobody
  // booked and a name nobody matches are different dead ends.
  const nothingText = rows.length === 0 ? labels.emptyRoster : labels.directNoMatch;

  return (
    <DuncitDialog
      open={open}
      onClose={onClose}
      testID="attendance-direct-dialog"
      title={labels.directTitle}
      closeLabel={labels.chooseCancel}
    >
      <YStack gap={12}>
        <Text fontSize={13} color="$muted">
          {labels.directBody}
        </Text>
        <Field label={labels.directSearchLabel} testID="attendance-direct-search">
          <Input
            testID="attendance-direct-search"
            // React Native has no `htmlFor`, so the visible label above is
            // repeated here — otherwise a screen reader reaches an unnamed box.
            aria-label={labels.directSearchLabel}
            value={query}
            onChangeText={setQuery}
            height={FIELD_HEIGHT}
            borderRadius={FIELD_RADIUS}
            borderColor="$borderColor"
            backgroundColor="$surface"
          />
        </Field>
        <YStack gap={8} testID="attendance-direct-results">
          {results.map((row) => (
            <DirectMarkResult
              key={row.membership_id}
              row={row}
              labels={labels}
              onPick={onPick}
            />
          ))}
          {results.length === 0 ? (
            <Text fontSize={13} color="$muted" testID="attendance-direct-no-match">
              {nothingText}
            </Text>
          ) : null}
        </YStack>
      </YStack>
    </DuncitDialog>
  );
}
