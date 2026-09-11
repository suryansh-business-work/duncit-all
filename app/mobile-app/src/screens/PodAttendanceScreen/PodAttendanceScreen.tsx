import { useMemo, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import {
  canScanTickets,
  earningsBodyFor,
  mwebAttendanceLabels,
  showsCompleteDeadline,
  splitAttendance,
} from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { LoadingIndicator } from '@/components/LoadingIndicator';
import { StackScreen } from '@/components/StackScreen';
import { AttendanceOtpSheet } from '@/components/attendance/AttendanceOtpSheet';
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
import { TicketScanDialog } from '@/components/host-manage/ticket-scan';
import { useAttendanceBoard } from '@/hooks/useAttendanceBoard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { RefreshScrollView } from '@/components/PullToRefresh';

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
  const { onPrimary } = useThemeColors();
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
          <NoticeCard tone="danger" title={board.error} />
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
          <Text fontSize={14} color="$muted">
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
          <NoticeCard tone="success" title={labels.allMarked} />
        ) : null}
        {marked.length > 0 && unmarked.length > 0 ? (
          <YStack height={1} backgroundColor="$borderColor" />
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
          <DuncitButton
            testID="attendance-scan-cta"
            label={labels.scanCta}
            onPress={() => setScanOpen(true)}
            size="lg"
            fullWidth
            icon={<MaterialIcons name="qr-code-scanner" size={20} color={onPrimary} />}
          />
        ) : null}

        <ClubAdminHelpCard admins={data.club_admins} labels={labels} />
      </YStack>
    );
  };

  return (
    <StackScreen title={labels.pageTitle} testID="pod-attendance-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {body()}
      </RefreshScrollView>

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
