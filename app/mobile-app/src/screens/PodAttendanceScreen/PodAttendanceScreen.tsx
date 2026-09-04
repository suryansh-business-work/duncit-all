import { useMemo, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Text, YStack } from 'tamagui';
import {
  canScanTickets,
  earningsBodyFor,
  mwebAttendanceLabels,
  showsCompleteDeadline,
  splitAttendance,
} from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { StackScreen } from '@/components/StackScreen';
import { AttendanceOtpSheet } from '@/components/attendance/AttendanceOtpSheet';
import { AttendanceRosterSection } from '@/components/attendance/AttendanceRosterSection';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import {
  AttendanceSummary,
  ClubAdminHelpCard,
  DeadlineNotice,
  EarningsNotice,
  LockedNotice,
} from '@/components/attendance/AttendanceNotices';
import { TicketScanDialog } from '@/components/host-manage/ticket-scan';
import { useAttendanceBoard } from '@/hooks/useAttendanceBoard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

/**
 * Host Studio > Your Pods > ⋮ > See Marked Attendance.
 *
 * A screen rather than another sheet. Attendance used to be a list inside the
 * Complete-pod dialog's payout preview — three levels deep in a form about
 * something else, where the only way to mark anyone was a Scan button on each
 * line. Here marked and unmarked are separated, every row carries its own
 * action, and the scanner is one deliberate button at the bottom.
 *
 * The mWeb twin is `app/mweb/src/pages/pod-attendance-page` (rule 27); the
 * logic both of them read is `@duncit/utils`' pod-attendance helpers.
 */
export function PodAttendanceScreen() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { params } = useRoute<RouteProp<RootStackParamList, 'PodAttendance'>>();
  const podId = params?.podId ?? '';
  const labels = useMemo(() => mwebAttendanceLabels(t), [t]);
  const board = useAttendanceBoard(podId);
  const [scanOpen, setScanOpen] = useState(false);

  const data = board.board;
  const { marked, unmarked } = splitAttendance(data?.rows ?? []);
  const onMark = data?.can_mark ? board.startMark : undefined;

  const body = () => {
    if (board.isLoading) return <LoadingIndicator />;
    if (!data) {
      return (
        <YStack gap={12}>
          <Text fontSize={13} color="$danger">
            {board.error}
          </Text>
          <PillButton
            testID="attendance-retry"
            label={labels.retry}
            onPress={board.refetch}
            variant="ghost"
            disabled={false}
          />
        </YStack>
      );
    }
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

        {data.rows.length === 0 ? (
          <Text fontSize={13} color="$muted">
            {labels.emptyRoster}
          </Text>
        ) : null}

        <AttendanceRosterSection
          heading={labels.unmarkedHeading}
          rows={unmarked}
          labels={labels}
          canMark={data.can_mark}
          busyId={board.busyId}
          formatDateTime={formatDateTime}
          onMark={onMark}
        />
        {unmarked.length === 0 && data.rows.length > 0 ? (
          <Text fontSize={13} fontWeight="700" color="$success">
            {labels.allMarked}
          </Text>
        ) : null}
        <AttendanceRosterSection
          heading={labels.markedHeading}
          rows={marked}
          labels={labels}
          canMark={data.can_mark}
          busyId={board.busyId}
          formatDateTime={formatDateTime}
        />

        {/* A virtual pod has no door: its members are marked when they open the
            meeting link, so there is nothing to scan. */}
        {canScanTickets(data) ? (
          <PillButton
            testID="attendance-scan-cta"
            label={labels.scanCta}
            onPress={() => setScanOpen(true)}
            variant="solid"
            disabled={false}
          />
        ) : null}

        <ClubAdminHelpCard admins={data.club_admins} labels={labels} />
      </YStack>
    );
  };

  return (
    <StackScreen title={labels.pageTitle} testID="pod-attendance-screen">
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>{body()}</ScrollView>

      <AttendanceOtpSheet
        podId={podId}
        row={board.otpRow}
        labels={labels}
        onClose={board.cancelOtp}
        onVerified={board.finishMark}
      />
      {/* Closing the scanner re-reads the board, so a guest scanned at the door
          moves into the marked list behind it. */}
      <TicketScanDialog
        pod={scanOpen && data ? { id: data.pod_id, pod_title: data.pod_title } : null}
        onClose={() => {
          setScanOpen(false);
          board.refetch();
        }}
        onOpenProfile={(userId) => {
          setScanOpen(false);
          navigation.navigate('PublicProfile', { userId });
        }}
      />
    </StackScreen>
  );
}
