import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import type { VenueChatHostCard, VenueChatVenueCard } from '@duncit/utils';

import { AttendeeAvatar } from '@/components/attendance/AttendeeAvatar';
import { ChatRoomAvatar } from '@/components/chat/ChatRoomAvatar';
import { VenueChatContactLink } from '@/components/chat/VenueChatContactLink';
import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** A party's phone and email as tappable links, or that neither is on record. */
function ContactLinks({
  phone,
  email,
  testIDPrefix,
}: Readonly<{ phone: string; email: string; testIDPrefix: string }>) {
  const { t } = useTranslation();
  const tel = phone.trim();
  const mail = email.trim();
  if (!tel && !mail) {
    return (
      <Text testID={`${testIDPrefix}-no-contact`} fontSize={13} color="$muted">
        {t('availability.offers.chat.noContact')}
      </Text>
    );
  }
  return (
    <YStack gap={2}>
      {tel ? (
        <VenueChatContactLink kind="phone" value={tel} testID={`${testIDPrefix}-phone`} />
      ) : null}
      {mail ? (
        <VenueChatContactLink kind="email" value={mail} testID={`${testIDPrefix}-email`} />
      ) : null}
    </YStack>
  );
}

/** One party's card: whose it is, their face and facts, how to reach them and their page. */
function PartyCard({
  testID,
  heading,
  face,
  children,
  action,
}: Readonly<{
  testID: string;
  heading: string;
  face: ReactNode;
  children: ReactNode;
  action: ReactNode;
}>) {
  return (
    <SurfaceCard testID={testID} gap={12}>
      <Text role="heading" fontSize={12} fontWeight="700" color="$muted" textTransform="uppercase">
        {heading}
      </Text>
      <XStack gap={12} alignItems="flex-start">
        {face}
        <YStack flex={1} minWidth={0} gap={4}>
          {children}
        </YStack>
      </XStack>
      {action}
    </SurfaceCard>
  );
}

/** The pod's lead host: photo, name, @handle, bio, phone and email, and their profile. */
export function HostContactCard({
  host,
  onViewProfile,
}: Readonly<{ host: VenueChatHostCard; onViewProfile: (userId: string) => void }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <PartyCard
      testID="venue-chat-host-card"
      heading={t('availability.offers.chat.hostCard')}
      face={<AttendeeAvatar uri={host.photo ?? ''} name={host.name} size={56} />}
      action={
        <DuncitButton
          testID="venue-chat-host-profile"
          label={t('availability.offers.chat.viewProfile')}
          onPress={() => onViewProfile(host.user_id)}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="person-outline" size={16} color={accent} />}
        />
      }
    >
      <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={1}>
        {host.name}
      </Text>
      {host.username ? (
        <Text fontSize={13} color="$muted" numberOfLines={1}>
          @{host.username}
        </Text>
      ) : null}
      {host.bio ? (
        <Text fontSize={13} color="$color" numberOfLines={4}>
          {host.bio}
        </Text>
      ) : null}
      <ContactLinks phone={host.phone} email={host.email} testIDPrefix="venue-chat-host" />
    </PartyCard>
  );
}

/** The venue: photo, name, type, capacity, address, who to ask for, phone and email, and its page. */
export function VenueContactCard({
  venue,
  onViewVenue,
}: Readonly<{ venue: VenueChatVenueCard; onViewVenue: (venueId: string) => void }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  const facts = [
    venue.venue_type,
    venue.capacity > 0
      ? t('availability.offers.chat.capacity', { vars: { count: venue.capacity } })
      : '',
  ].filter(Boolean);
  return (
    <PartyCard
      testID="venue-chat-venue-card"
      heading={t('availability.offers.chat.venueCard')}
      face={<ChatRoomAvatar coverUrl={venue.photo} fallbackIcon="storefront" />}
      action={
        <DuncitButton
          testID="venue-chat-venue-page"
          label={t('availability.offers.chat.viewVenue')}
          onPress={() => onViewVenue(venue.venue_id)}
          variant="outline"
          size="sm"
          icon={<MaterialIcons name="storefront" size={16} color={accent} />}
        />
      }
    >
      <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={2}>
        {venue.venue_name}
      </Text>
      {facts.length > 0 ? (
        <Text fontSize={13} color="$muted">
          {facts.join(' · ')}
        </Text>
      ) : null}
      {venue.address ? (
        <Text fontSize={13} color="$color">
          {venue.address}
        </Text>
      ) : null}
      {venue.name ? (
        <Text fontSize={13} fontWeight="600" color="$color">
          {t('availability.offers.chat.contactPerson', { vars: { name: venue.name } })}
        </Text>
      ) : null}
      <ContactLinks phone={venue.phone} email={venue.email} testIDPrefix="venue-chat-venue" />
    </PartyCard>
  );
}
