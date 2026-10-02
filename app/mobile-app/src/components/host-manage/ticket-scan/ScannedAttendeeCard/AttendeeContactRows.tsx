import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import type { ScannedAttendee } from '../scan.types';

type IconName = keyof typeof MaterialIcons.glyphMap;

interface DetailRowProps {
  icon: IconName;
  value: string;
  tint: string;
  href?: string;
}

/** One contact line — only rendered when the attendee has the field on file. */
function DetailRow({ icon, value, tint, href }: Readonly<DetailRowProps>) {
  const open = href
    ? () => {
        Linking.openURL(href).catch(() => undefined);
      }
    : undefined;
  return (
    <XStack
      alignItems="flex-start"
      gap={8}
      tabIndex={href ? 0 : undefined}
      role={href ? 'button' : undefined}
      aria-label={href ? value : undefined}
      onPress={open}
      pressStyle={href ? { opacity: 0.7 } : undefined}
    >
      <MaterialIcons name={icon} size={16} color={tint} />
      <Text flex={1} fontSize={13} color={href ? '$accent' : '$color'}>
        {value}
      </Text>
    </XStack>
  );
}

/** The attendee's contact lines — each only when it is on file. */
export function AttendeeContactRows({
  attendee,
  joined,
  muted,
}: Readonly<{ attendee: ScannedAttendee; joined: string; muted: string }>) {
  return (
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
      {attendee.whatsapp ? <DetailRow icon="chat" value={attendee.whatsapp} tint={muted} /> : null}
      {attendee.address ? <DetailRow icon="home" value={attendee.address} tint={muted} /> : null}
      {attendee.city ? <DetailRow icon="location-city" value={attendee.city} tint={muted} /> : null}
      {joined ? <DetailRow icon="event-available" value={`Joined ${joined}`} tint={muted} /> : null}
    </YStack>
  );
}
