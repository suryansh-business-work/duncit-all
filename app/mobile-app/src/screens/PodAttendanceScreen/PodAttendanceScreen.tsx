import { useMemo, useState } from 'react';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';
import { mwebAttendanceLabels, splitAttendance } from '@duncit/utils';

import { LoadingIndicator } from '@/components/LoadingIndicator';
import { StackScreen } from '@/components/StackScreen';
import { AttendanceOtpSheet } from '@/components/attendance/AttendanceOtpSheet';
import { ClubAdminMarkSheet } from '@/components/attendance/ClubAdminMarkSheet';
import { DirectMarkSheet } from '@/components/attendance/DirectMarkSheet';
import { ForceMarkSheet } from '@/components/attendance/ForceMarkSheet';
import { PillButton } from '@/components/attendance/AttendanceOtpControls';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { TicketScanDialog } from '@/components/host-manage/ticket-scan';
import { useAttendanceBoard } from '@/hooks/useAttendanceBoard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { RefreshScrollView } from '@/components/PullToRefresh';

import { AttendanceBoardBody } from './AttendanceBoardBody';

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
      <AttendanceBoardBody
        data={data}
        board={board}
        labels={labels}
        marked={marked}
        unmarked={unmarked}
        onMark={onMark}
        formatDateTime={formatDateTime}
        onPrimary={onPrimary}
        onScan={() => setScanOpen(true)}
      />
    );
  };

  return (
    <StackScreen title={labels.pageTitle} testID="pod-attendance-screen">
      <RefreshScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {body()}
      </RefreshScrollView>

      {/* The Club Admin's doors. Asked in the order the shared MUI board asks
          them (rule 27): which door, then either the code or the name — and
          every by-name mark still lands on the warning that names the person
          (rule 41). */}
      <ClubAdminMarkSheet
        row={board.choiceRow}
        labels={labels}
        onClose={board.cancelChoice}
        onChooseOtp={board.chooseOtp}
        onChooseDirect={board.chooseDirect}
      />
      <DirectMarkSheet
        open={board.directOpen}
        rows={data?.rows ?? []}
        labels={labels}
        onClose={board.cancelDirect}
        onPick={board.pickDirect}
      />
      <ForceMarkSheet
        row={board.forceRow}
        labels={labels}
        busy={!!board.busyId}
        onClose={board.cancelForce}
        onConfirm={board.confirmForce}
      />
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
