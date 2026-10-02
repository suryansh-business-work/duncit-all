import { Text, XStack, YStack } from 'tamagui';
import {
  attendanceProgress,
  type PodAttendanceBoard,
  type PodAttendanceLabels,
  type PodAttendanceLock,
} from '@duncit/utils';

import { NoticeCard } from '@/components/attendance/NoticeCard';

/** How far through the roster the host is. The headline counts PEOPLE, because
 * eight seats on one booking are eight attendees and the payout is split on
 * them; the bookings count sits beside it. Word-for-word the mWeb twin. */
export function AttendanceSummary({
  board,
  labels,
}: Readonly<{ board: PodAttendanceBoard; labels: PodAttendanceLabels }>) {
  const percent = attendanceProgress(board);
  const complete = board.total_count > 0 && board.marked_count === board.total_count;

  return (
    <YStack gap={8} testID="attendance-summary">
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text flexShrink={1} fontSize={15} fontWeight="600" color="$color">
          {labels.summary(board.marked_seats, board.total_seats)}
        </Text>
        <XStack
          alignItems="center"
          height={28}
          paddingHorizontal={12}
          borderRadius={999}
          backgroundColor={complete ? '$successSoft' : '$soft'}
        >
          <Text fontSize={12} fontWeight="600" color="$color">
            {labels.bookingsSummary(board.marked_count, board.total_count)}
          </Text>
        </XStack>
      </XStack>
      <YStack height={8} borderRadius={999} backgroundColor="$primarySoft" overflow="hidden">
        <YStack height={8} borderRadius={999} width={`${percent}%`} backgroundColor="$primary" />
      </YStack>
    </YStack>
  );
}

/** Why marking matters: unmarked attendee, unpaid seat. The body is the
 * sentence for the pod's kind — a door scan or a meeting link — so the caller
 * picks it with `earningsBodyFor(board, labels)`. */
export function EarningsNotice({
  labels,
  body,
}: Readonly<{ labels: PodAttendanceLabels; body: string }>) {
  return (
    <NoticeCard
      testID="attendance-earnings-note"
      tone="info"
      title={labels.earningsTitle}
      body={body}
    />
  );
}

/**
 * How long the host still has.
 *
 * Warning-tinted, not info: it is the one thing on this screen that costs the
 * host money by being ignored. Shown only while the window is open and only to
 * the host (`showsCompleteDeadline`) — past it, the EXPIRED `LockedNotice`
 * below says the same thing in the past tense. Word-for-word the mWeb twin.
 */
export function DeadlineNotice({
  labels,
  when,
  hours,
}: Readonly<{ labels: PodAttendanceLabels; when: string; hours: number }>) {
  return (
    <NoticeCard
      testID="attendance-deadline-note"
      tone="warning"
      icon="schedule"
      title={labels.deadlineTitle(when)}
      body={labels.deadlineBody(hours)}
    />
  );
}

/** The roster is closed and nothing on it can move. */
export function LockedNotice({
  lock,
  labels,
}: Readonly<{ lock: PodAttendanceLock; labels: PodAttendanceLabels }>) {
  return (
    <NoticeCard
      testID="attendance-locked-note"
      tone="warning"
      icon="lock"
      title={labels.lockedTitle(lock)}
      body={labels.lockedBody(lock)}
    />
  );
}
