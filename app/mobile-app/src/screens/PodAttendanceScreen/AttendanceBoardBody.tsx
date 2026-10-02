import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import {
  canDirectMark,
  canScanTickets,
  earningsBodyFor,
  showsCompleteDeadline,
  type splitAttendance,
  type mwebAttendanceLabels,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { AttendanceRosterSection } from '@/components/attendance/AttendanceRosterSection';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import {
  AttendanceSummary,
  ClubAdminHelpCard,
  DeadlineNotice,
  EarningsNotice,
  LockedNotice,
} from '@/components/attendance/AttendanceNotices';
import type { useAttendanceBoard } from '@/hooks/useAttendanceBoard';
import type { useDateFormat } from '@/hooks/useDateFormat';

type AttendanceBoardState = ReturnType<typeof useAttendanceBoard>;

interface AttendanceBoardBodyProps {
  data: NonNullable<AttendanceBoardState['board']>;
  board: AttendanceBoardState;
  labels: ReturnType<typeof mwebAttendanceLabels>;
  marked: ReturnType<typeof splitAttendance>['marked'];
  unmarked: ReturnType<typeof splitAttendance>['unmarked'];
  onMark: AttendanceBoardState['startMark'] | undefined;
  formatDateTime: ReturnType<typeof useDateFormat>['formatDateTime'];
  onPrimary: string;
  onScan: () => void;
}

/** The loaded board: summary and notices, the two rosters, the scanner button
 * and — for a host — the Club Admin help card. */
export function AttendanceBoardBody({
  data,
  board,
  labels,
  marked,
  unmarked,
  onMark,
  formatDateTime,
  onPrimary,
  onScan,
}: Readonly<AttendanceBoardBodyProps>) {
  return (
    <YStack gap={16}>
      <AttendanceSummary board={data} labels={labels} />
      {data.can_mark ? (
        <EarningsNotice labels={labels} body={earningsBodyFor(data, labels)} />
      ) : (
        <LockedNotice lock={data.lock} labels={labels} />
      )}
      {showsCompleteDeadline(data) ? (
        <DeadlineNotice
          labels={labels}
          when={formatDateTime(data.complete_deadline ?? '')}
          hours={data.complete_timeout_hours}
        />
      ) : null}

      {/* On EVERY pod a Club Admin may still write to, empty roster included
        — the whole point is that they no longer have to find a row to
        start from. Never offered to a host: their by-hand mark is gated on
        the admin's one-time-code setting, and a door that skipped it would
        quietly undo the setting. */}
      {canDirectMark(data) ? (
        <PillButton
          testID="attendance-direct-cta"
          label={labels.directCta}
          onPress={board.openDirect}
          variant="ghost"
          disabled={false}
        />
      ) : null}

      {data.rows.length === 0 ? (
        <Text fontSize={14} color="$muted">
          {labels.emptyRoster}
        </Text>
      ) : null}

      <AttendanceRosterSection
        testID="attendance-unmarked"
        heading={labels.unmarkedHeading}
        rows={unmarked}
        labels={labels}
        canMark={data.can_mark}
        viewer={data.viewer}
        busyId={board.busyId}
        formatDateTime={formatDateTime}
        onMark={onMark}
      />
      {unmarked.length === 0 && data.rows.length > 0 ? (
        <NoticeCard tone="success" title={labels.allMarked} />
      ) : null}
      {marked.length > 0 && unmarked.length > 0 ? (
        <YStack height={1} backgroundColor="$borderColor" />
      ) : null}
      <AttendanceRosterSection
        testID="attendance-marked"
        heading={labels.markedHeading}
        rows={marked}
        labels={labels}
        canMark={data.can_mark}
        viewer={data.viewer}
        busyId={board.busyId}
        formatDateTime={formatDateTime}
      />

      {/* A virtual pod has no door: its members are marked when they open the
        meeting link, so there is nothing to scan. */}
      {canScanTickets(data) ? (
        <DuncitButton
          testID="attendance-scan-cta"
          label={labels.scanCta}
          onPress={onScan}
          size="lg"
          fullWidth
          icon={<MaterialIcons name="qr-code-scanner" size={20} color={onPrimary} />}
        />
      ) : null}

      {/* Only useful to a host who has run out of options — a Club Admin
        reading their own section does not need their own phone number.
        The MUI twin gates it the same way (rule 27). */}
      {data.viewer === 'HOST' ? (
        <ClubAdminHelpCard admins={data.club_admins} labels={labels} />
      ) : null}
    </YStack>
  );
}
