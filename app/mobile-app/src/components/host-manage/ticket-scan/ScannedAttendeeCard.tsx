import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { ScannedAttendee } from './scan.types';
import { formatDateTime } from '@/utils/date-format';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface DetailRowProps {
  icon: IconName;
  value: string;
  tint: string;
  href?: string;
}

/** One contact line — only rendered when the attendee has the field on file. */
function DetailRow({ icon, value, tint, href }: Readonly<DetailRowProps>) {
  const open = href ? () => void Linking.openURL(href).catch(() => undefined) : undefined;
  return (
    <XStack
      alignItems="flex-start"
      gap={8}
      role={href ? 'button' : undefined}
      aria-label={href ? value : undefined}
      onPress={open}
      pressStyle={href ? { opacity: 0.7 } : undefined}
    >
      <MaterialIcons name={icon} size={16} color={tint} />
      <Text flex={1} fontSize={13} color={href ? '$primary' : '$color'}>
        {value}
      </Text>
    </XStack>
  );
}

const formatWhen = (value: string | null) => {
  if (!value) return '';
  const d = new Date(value);
  return formatDateTime(d);
};

interface Props {
  attendee: ScannedAttendee;
  alreadyCheckedIn: boolean;
  /** True while the group's details are still being collected — nobody is
   * marked yet, and the status line must not claim otherwise. */
  pending?: boolean;
  ticketCode?: string;
  /** People this one ticket admits — a group booking scans once. */
  seats?: number;
  onOpenProfile: () => void;
}

/** Who just walked in — the Tamagui twin of mWeb's ScannedAttendeeCard (rule 27). */
export function ScannedAttendeeCard({
  attendee,
  alreadyCheckedIn,
  pending = false,
  ticketCode,
  seats = 1,
  onOpenProfile,
}: Readonly<Props>) {
  const { muted, onPrimary, primary, success } = useThemeColors();
  const { t } = useTranslation();
  const joined = formatWhen(attendee.joined_at);
  // A ticket awaiting its companions has marked NOBODY — the old line said
  // "Marked present" here, which made the broken second step look done.
  let presenceLabel = 'Marked present';
  let statusTint = success;
  if (pending) {
    presenceLabel = t('mweb.hostScan.notMarkedYet');
    statusTint = muted;
  } else if (alreadyCheckedIn) {
    presenceLabel = 'Already present';
    statusTint = muted;
  }
  // One QR can admit a whole group, so the head count is the first thing the
  // host needs at the door — it decides how many people walk past them.
  const partyText =
    seats === 1 ? t('mweb.hostScan.personOnTicket') : t('mweb.hostScan.peopleOnTicket');

  return (
    <YStack gap={12} testID="scanned-attendee">
      <XStack alignItems="center" gap={12}>
        {attendee.profile_photo ? (
          <Image
            source={{ uri: attendee.profile_photo }}
            style={{ width: 64, height: 64, borderRadius: 32 }}
            contentFit="cover"
          />
        ) : (
          <YStack
            width={64}
            height={64}
            borderRadius={32}
            alignItems="center"
            justifyContent="center"
            backgroundColor="$surface"
          >
            <Text fontSize={24} fontWeight="700" color="$muted">
              {attendee.full_name.slice(0, 1).toUpperCase()}
            </Text>
          </YStack>
        )}
        <YStack flex={1} gap={4}>
          <Text fontSize={17} fontWeight="700" color="$color" numberOfLines={1}>
            {attendee.full_name}
          </Text>
          <Text fontSize={12.5} fontWeight="700" color={statusTint}>
            {presenceLabel}
            {ticketCode ? ` · ${ticketCode}` : ''}
          </Text>
        </YStack>
      </XStack>

      <XStack
        testID="scan-party-size"
        alignItems="center"
        gap={12}
        padding={12}
        borderRadius={16}
        borderWidth={2}
        borderColor="$primary"
        backgroundColor="$surface"
      >
        <YStack
          width={44}
          height={44}
          borderRadius={22}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$primary"
        >
          <Text fontSize={20} fontWeight="800" color={onPrimary}>
            {seats}
          </Text>
        </YStack>
        <Text flex={1} fontSize={15} fontWeight="700" color="$color">
          {partyText}
        </Text>
      </XStack>

      {attendee.bio ? (
        <Text fontSize={13} color="$muted">
          {attendee.bio}
        </Text>
      ) : null}

      <YStack gap={8}>
        {attendee.email ? (
          <DetailRow
            icon="email"
            value={attendee.email}
            tint={muted}
            href={`mailto:${attendee.email}`}
          />
        ) : null}
        {attendee.phone ? (
          <DetailRow
            icon="phone"
            value={attendee.phone}
            tint={muted}
            href={`tel:${attendee.phone.replace(/\s/g, '')}`}
          />
        ) : null}
        {attendee.whatsapp ? (
          <DetailRow icon="chat" value={attendee.whatsapp} tint={muted} />
        ) : null}
        {attendee.address ? <DetailRow icon="home" value={attendee.address} tint={muted} /> : null}
        {attendee.city ? (
          <DetailRow icon="location-city" value={attendee.city} tint={muted} />
        ) : null}
        {joined ? (
          <DetailRow icon="event-available" value={`Joined ${joined}`} tint={muted} />
        ) : null}
      </YStack>

      <XStack
        testID="scanned-attendee-profile"
        role="button"
        aria-label="View profile"
        onPress={onOpenProfile}
        alignItems="center"
        justifyContent="center"
        gap={8}
        height={44}
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        pressStyle={{ opacity: 0.85 }}
      >
        <MaterialIcons name="open-in-new" size={16} color={primary} />
        <Text fontSize={13.5} fontWeight="700" color="$primary">
          View profile
        </Text>
      </XStack>
    </YStack>
  );
}
