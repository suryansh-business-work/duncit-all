import { useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { HostCard, VenueCard } from '@/components/hosts-venues';
import { MeetingStatusCard } from '@/components/hosts-venues/MeetingStatusCard';
import { StackScreen } from '@/components/StackScreen';
import { useHostsVenues } from '@/hooks/useHostsVenues';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

type Tab = 'HOSTS' | 'VENUES';

/** Hosts & Venues discovery — two tabs that open public profiles / venue details.
 * RN twin of mWeb's HostsVenuesPage. */
export function HostsVenuesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hosts, venues, meId, followingIds, pendingFollow, isLoading, error, toggleFollow } =
    useHostsVenues();
  const [tab, setTab] = useState<Tab>('HOSTS');

  let tabContent: ReactNode;
  if (tab === 'HOSTS') {
    tabContent =
      hosts.length === 0 ? (
        <Text testID="hosts-empty" color="$muted">
          No approved hosts yet — be the first to apply!
        </Text>
      ) : (
        hosts.map((host) => (
          <HostCard
            key={host.id}
            host={host}
            isMe={host.user_id === meId}
            isFollowing={followingIds.has(host.user_id)}
            pending={pendingFollow === host.user_id}
            onOpen={() => navigation.navigate('PublicProfile', { userId: host.user_id })}
            onToggleFollow={() => void toggleFollow(host.user_id)}
          />
        ))
      );
  } else {
    tabContent =
      venues.length === 0 ? (
        <Text testID="venues-empty" color="$muted">
          No approved venues yet.
        </Text>
      ) : (
        venues.map((venue) => (
          <VenueCard
            key={venue.id}
            venue={venue}
            onOpen={() => navigation.navigate('VenueDetails', { venueId: venue.id })}
          />
        ))
      );
  }

  let hostsVenuesBody: ReactNode;
  if (isLoading && hosts.length === 0 && venues.length === 0) {
    hostsVenuesBody = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="hosts-venues-loading" color="$primary" />
      </YStack>
    );
  } else if (error) {
    hostsVenuesBody = (
      <Text testID="hosts-venues-error" padding={24} color="$danger">
        {toErrorMessage(error)}
      </Text>
    );
  } else {
    hostsVenuesBody = (
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 10 }}>
        <MeetingStatusCard kind="HOST" />
        <MeetingStatusCard kind="VENUE" />
        {tabContent}
      </ScrollView>
    );
  }

  return (
    <StackScreen title="Hosts & Venues" testID="hosts-venues-screen">
      <XStack gap={8} paddingHorizontal={16} paddingBottom={8}>
        {(['HOSTS', 'VENUES'] as Tab[]).map((t) => {
          const selected = tab === t;
          return (
            <XStack
              key={t}
              testID={`hv-tab-${t.toLowerCase()}`}
              role="button"
              aria-pressed={selected}
              onPress={() => setTab(t)}
              flex={1}
              height={38}
              alignItems="center"
              justifyContent="center"
              borderRadius={12}
              backgroundColor={selected ? '$primary' : '$surface'}
              borderWidth={1}
              borderColor={selected ? '$primary' : '$borderColor'}
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={13} fontWeight="900" color={selected ? '$onPrimary' : '$color'}>
                {t === 'HOSTS' ? 'Hosts' : 'Venues'}
              </Text>
            </XStack>
          );
        })}
      </XStack>

      {hostsVenuesBody}
    </StackScreen>
  );
}
