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
import { useThemeColors } from '@/hooks/useThemeColors';

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};

/** How far through the roster the host is — seats, because the payout is. */
export function AttendanceSummary({
  board,
  labels,
}: Readonly<{ board: PodAttendanceBoard; labels: PodAttendanceLabels }>) {
  const { success, primary } = useThemeColors();
  const percent = attendanceProgress(board);
  const complete = board.total_count > 0 && board.marked_count === board.total_count;
  const tint = complete ? success : primary;

  return (
    <YStack gap={6} testID="attendance-summary">
      <XStack alignItems="center" justifyContent="space-between" gap={8}>
        <Text fontSize={13.5} fontWeight="700" color="$color">
          {labels.summary(board.marked_count, board.total_count)}
        </Text>
        <Text fontSize={12} fontWeight="700" color={tint}>
          {labels.seatsSummary(board.marked_seats, board.total_seats)}
        </Text>
      </XStack>
      <YStack height={8} borderRadius={999} backgroundColor="$surface" overflow="hidden">
        <YStack height={8} width={`${percent}%`} backgroundColor={tint} />
      </YStack>
    </YStack>
  );
}

/** A titled block of copy with a coloured rail — the RN stand-in for an Alert. */
function NoticeBlock({
  tint,
  icon,
  title,
  body,
  testID,
}: Readonly<{
  tint: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
  testID: string;
}>) {
  return (
    <XStack
      testID={testID}
      gap={10}
      padding={12}
      borderRadius={14}
      borderLeftWidth={3}
      borderLeftColor={tint}
      backgroundColor="$surface"
    >
      <MaterialIcons name={icon} size={18} color={tint} />
      <YStack flex={1} gap={3}>
        <Text fontSize={13} fontWeight="800" color="$color">
          {title}
        </Text>
        <Text fontSize={12.5} color="$muted" lineHeight={17}>
          {body}
        </Text>
      </YStack>
    </XStack>
  );
}

/** Why marking matters: unmarked attendee, unpaid seat. The body is the
 * sentence for the pod's kind — a door scan or a meeting link — so the caller
 * picks it with `earningsBodyFor(board, labels)`. */
export function EarningsNotice({
  labels,
  body,
}: Readonly<{ labels: PodAttendanceLabels; body: string }>) {
  const { primary } = useThemeColors();
  return (
    <NoticeBlock
      testID="attendance-earnings-note"
      tint={primary}
      icon="info"
      title={labels.earningsTitle}
      body={body}
    />
  );
}

/** The roster is closed and nothing on it can move. */
export function LockedNotice({
  lock,
  labels,
}: Readonly<{ lock: PodAttendanceLock; labels: PodAttendanceLabels }>) {
  const { warning } = useThemeColors();
  return (
    <NoticeBlock
      testID="attendance-locked-note"
      tint={warning}
      icon="lock"
      title={labels.lockedTitle(lock)}
      body={labels.lockedBody(lock)}
    />
  );
}

/** One tappable way to reach a person. */
function ContactPill({
  label,
  icon,
  url,
}: Readonly<{ label: string; icon: keyof typeof MaterialIcons.glyphMap; url: string }>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      role="button"
      aria-label={label}
      onPress={() => openUrl(url)}
      alignItems="center"
      gap={5}
      paddingHorizontal={10}
      height={30}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={{ opacity: 0.7 }}
    >
      <MaterialIcons name={icon} size={14} color={primary} />
      <Text fontSize={12} fontWeight="700" color="$color">
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
    <XStack gap={10} alignItems="center">
      <AttendeeAvatar uri={admin.avatar_url} name={admin.name} size={34} />
      <YStack flex={1} gap={4}>
        <Text fontSize={13.5} fontWeight="700" color="$color" numberOfLines={1}>
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
      gap={10}
      padding={14}
      borderRadius={14}
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={13.5} fontWeight="800" color="$color">
        {labels.clubAdminTitle}
      </Text>
      <Text fontSize={12} color="$muted" lineHeight={17}>
        {labels.clubAdminBody}
      </Text>
      {admins.length === 0 ? (
        <Text fontSize={12.5} color="$muted">
          {labels.clubAdminNone}
        </Text>
      ) : (
        admins.map((admin) => <ClubAdminRow key={admin.id} admin={admin} labels={labels} />)
      )}
    </YStack>
  );
}
