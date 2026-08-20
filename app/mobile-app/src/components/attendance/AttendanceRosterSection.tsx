import { Text, YStack } from 'tamagui';
import type { PodAttendanceLabels, PodAttendanceRow } from '@duncit/utils';

import { AttendanceRow } from '@/components/attendance/AttendanceRow';

interface Props {
  heading: string;
  rows: PodAttendanceRow[];
  labels: PodAttendanceLabels;
  canMark: boolean;
  busyId: string;
  formatDateTime: (iso: string) => string;
  /** Absent on the already-marked list — those rows have nothing left to do. */
  onMark?: (row: PodAttendanceRow) => void;
}

const noop = () => undefined;

/** One list section — marked, or still to do. Renders nothing when empty, so
 * a fully-marked pod does not show a "Not marked yet · 0" heading. */
export function AttendanceRosterSection({
  heading,
  rows,
  labels,
  canMark,
  busyId,
  formatDateTime,
  onMark,
}: Readonly<Props>) {
  if (rows.length === 0) return null;
  return (
    <YStack gap={8}>
      <Text fontSize={11.5} fontWeight="800" color="$muted" textTransform="uppercase">
        {heading} · {rows.length}
      </Text>
      {rows.map((row) => (
        <AttendanceRow
          key={row.membership_id}
          row={row}
          labels={labels}
          canMark={canMark}
          busy={busyId === row.membership_id}
          formatDateTime={formatDateTime}
          onMark={onMark ?? noop}
        />
      ))}
    </YStack>
  );
}
