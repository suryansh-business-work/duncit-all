import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import {
  attendanceProgress,
  type PodAttendanceBoard,
  type PodAttendanceClubAdmin,
  type PodAttendanceLabels,
  type PodAttendanceLock,
} from '@duncit/utils';

import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { NoticeCard } from '@/components/attendance/NoticeCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};

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

/** One tappable way to reach a person — a soft pill, like the mWeb chip. */
function ContactPill({
  label,
  icon,
  url,
}: Readonly<{ label: string; icon: keyof typeof MaterialIcons.glyphMap; url: string }>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={() => openUrl(url)}
      alignItems="center"
      gap={6}
      paddingHorizontal={12}
      height={32}
      borderRadius={999}
      backgroundColor="$soft"
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={14} color={ink} />
      <Text fontSize={13} fontWeight="600" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

function ClubAdminRow({
  admin,
  labels,
}: Readonly<{ admin: PodAttendanceClubAdmin; labels: PodAttendanceLabels }>) {
  const dial = admin.phone.replace(/[^\d+]/g, '');
  const wa = admin.whatsapp.replace(/\D/g, '');
  return (
    <XStack gap={12} alignItems="center">
      <AttendeeAvatar uri={admin.avatar_url} name={admin.name} size={36} />
      <YStack flex={1} gap={6}>
        <Text fontSize={15} fontWeight="600" color="$color" numberOfLines={1}>
          {admin.name}
        </Text>
        <XStack gap={6} flexWrap="wrap">
          {admin.email ? (
            <ContactPill label={labels.contactEmail} icon="email" url={`mailto:${admin.email}`} />
          ) : null}
          {dial ? (
            <ContactPill label={labels.contactPhone} icon="call" url={`tel:${dial}`} />
          ) : null}
          {wa ? (
            <ContactPill label={labels.contactWhatsapp} icon="chat" url={`https://wa.me/${wa}`} />
          ) : null}
        </XStack>
      </YStack>
    </XStack>
  );
}

/**
 * Who to ask when the host cannot mark somebody themselves.
 *
 * At the BOTTOM of the screen, under the roster: it answers "this person is
 * missing and I cannot add them", which is a question the host only has after
 * reading the list.
 */
export function ClubAdminHelpCard({
  admins,
  labels,
}: Readonly<{ admins: readonly PodAttendanceClubAdmin[]; labels: PodAttendanceLabels }>) {
  return (
    <YStack
      testID="attendance-club-admin-card"
      gap={12}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
    >
      <YStack gap={4}>
        <Text fontSize={15} fontWeight="600" color="$color">
          {labels.clubAdminTitle}
        </Text>
        <Text fontSize={13} color="$muted" lineHeight={18}>
          {labels.clubAdminBody}
        </Text>
      </YStack>
      {admins.length === 0 ? (
        <Text fontSize={13} color="$muted">
          {labels.clubAdminNone}
        </Text>
      ) : (
        admins.map((admin) => <ClubAdminRow key={admin.id} admin={admin} labels={labels} />)
      )}
    </YStack>
  );
}
