import { useState, type ReactNode } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { EmptyState } from '@/components/EmptyState';
import { HostCard, VenueCard } from '@/components/hosts-venues';
import { MeetingStatusCard } from '@/components/hosts-venues/MeetingStatusCard';
import { StackScreen } from '@/components/StackScreen';
import { useHostsVenues } from '@/hooks/useHostsVenues';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { RefreshScrollView } from '@/components/PullToRefresh';

type Tab = 'HOSTS' | 'VENUES';

/** Hosts & Venues discovery — two tabs that open public profiles / venue details.
 * RN twin of mWeb's HostsVenuesPage. */
export function HostsVenuesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { hosts, venues, meId, statusFor, pendingFollow, isLoading, error, toggleFollow } =
    useHostsVenues();
  const [tab, setTab] = useState<Tab>('HOSTS');

  let tabContent: ReactNode;
  if (tab === 'HOSTS') {
    tabContent =
      hosts.length === 0 ? (
        <EmptyState
          icon="person-outline"
          title="No approved hosts yet — be the first to apply!"
          testID="hosts-empty"
        />
      ) : (
        hosts.map((host) => (
          <HostCard
            key={host.id}
            host={host}
            isMe={host.user_id === meId}
            status={statusFor(host.user_id)}
            pending={pendingFollow === host.user_id}
            onOpen={() => navigation.navigate('PublicProfile', { userId: host.user_id })}
            onToggleFollow={() => fireAndForget(toggleFollow(host.user_id))}
          />
        ))
      );
  } else {
    tabContent =
      venues.length === 0 ? (
        <EmptyState icon="storefront" title="No approved venues yet." testID="venues-empty" />
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
      <RefreshScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 12 }}>
        <MeetingStatusCard kind="HOST" />
        <MeetingStatusCard kind="VENUE" />
        {tabContent}
      </RefreshScrollView>
    );
  }

  return (
    <StackScreen title={t('mweb.hostsVenues.hostsAndVenues')} testID="hosts-venues-screen">
      {/* A pill segmented control: a surface track, the chosen segment a green
          pill — mWeb's DuncitTabs strip draws the same (rule 27). */}
      <XStack
        gap={4}
        marginHorizontal={16}
        marginBottom={8}
        padding={4}
        borderRadius={999}
        borderWidth={1}
        borderColor="$cardBorder"
        backgroundColor="$surface"
      >
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
              height={40}
              alignItems="center"
              justifyContent="center"
              borderRadius={999}
              backgroundColor={selected ? '$primary' : 'transparent'}
              pressStyle={PRESS_STYLE.control}
            >
              <Text fontSize={14} fontWeight="600" color={selected ? '$onPrimary' : '$color'}>
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
