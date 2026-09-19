import { Text, YStack } from 'tamagui';
import type { PodAttendanceLabels, PodAttendanceRow, PodAttendanceViewer } from '@duncit/utils';

import { AttendanceRow } from '@/components/attendance/AttendanceRow';

interface Props {
  /** Distinct per list — the attendance screen renders the unmarked and the marked roster. */
  testID: string;
  heading: string;
  rows: PodAttendanceRow[];
  labels: PodAttendanceLabels;
  canMark: boolean;
  /** Who is reading the roster — only the host waits on the door companions. */
  viewer: PodAttendanceViewer;
  busyId: string;
  formatDateTime: (iso: string) => string;
  /** Absent on the already-marked list — those rows have nothing left to do. */
  onMark?: (row: PodAttendanceRow) => void;
}

const noop = () => undefined;

/** One list section — marked, or still to do. Renders nothing when empty, so
 * a fully-marked pod does not show a "Not marked yet · 0" heading. */
export function AttendanceRosterSection({
  testID,
  heading,
  rows,
  labels,
  canMark,
  viewer,
  busyId,
  formatDateTime,
  onMark,
}: Readonly<Props>) {
  if (rows.length === 0) return null;
  return (
    <YStack gap={8} testID={testID}>
      <Text
        testID={`${testID}-count`}
        fontSize={12}
        fontWeight="600"
        letterSpacing={0.6}
        color="$muted"
        textTransform="uppercase"
      >
        {heading} · {rows.length}
      </Text>
      {rows.map((row) => (
        <AttendanceRow
          key={row.membership_id}
          row={row}
          labels={labels}
          canMark={canMark}
          viewer={viewer}
          busy={busyId === row.membership_id}
          formatDateTime={formatDateTime}
          onMark={onMark ?? noop}
        />
      ))}
    </YStack>
  );
}
