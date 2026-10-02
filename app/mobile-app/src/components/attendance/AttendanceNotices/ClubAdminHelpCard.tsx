import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { PodAttendanceClubAdmin, PodAttendanceLabels } from '@duncit/utils';

import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

const openUrl = (url: string) => {
  Linking.openURL(url).catch(() => undefined);
};

/** One tappable way to reach a person — a soft pill, like the mWeb chip. */
function ContactPill({
  label,
  icon,
  url,
}: Readonly<{ label: string; icon: keyof typeof MaterialIcons.glyphMap; url: string }>) {
  const { color: ink } = useThemeColors();
  return (
    <XStack
      tabIndex={0}
      hitSlop={6}
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
