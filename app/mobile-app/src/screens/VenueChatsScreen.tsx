import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Spinner, Text, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { SelectedVenueBar } from '@/components/studio-options/SelectedVenueBar';
import { VenueChatThreadCard } from '@/components/venue-chat-inbox/VenueChatThreadCard';
import { useMyVenues } from '@/hooks/useMyVenues';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueChatThreads } from '@/hooks/useVenueChatThreads';
import type { RootStackParamList } from '@/navigation/types';

/** The picked venue's conversations with its pods' hosts, newest activity first. */
function VenueChatInbox({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const inbox = useVenueChatThreads(venueId);

  if (inbox.isLoading && inbox.rows.length === 0) {
    return (
      <Spinner
        role="progressbar"
        aria-label={t('mweb.a11y.loading')}
        testID="venue-chats-loading"
        color="$primary"
      />
    );
  }
  if (inbox.failed && inbox.rows.length === 0) {
    return (
      <Text role="alert" testID="venue-chats-error" fontSize={13} color="$danger">
        {t('mweb.venueChat.inboxLoadFailed')}
      </Text>
    );
  }
  if (inbox.rows.length === 0) {
    return (
      <EmptyState icon="forum" title={t('mweb.venueChat.inboxEmpty')} testID="venue-chats-empty" />
    );
  }
  return (
    <YStack gap={10}>
      {inbox.rows.map((row) => (
        <VenueChatThreadCard
          key={row.pod_id}
          row={row}
          onPress={() => navigation.navigate('VenueChat', { podId: row.pod_id })}
        />
      ))}
      {inbox.rows.length < inbox.total ? (
        <DuncitButton
          testID="venue-chats-more"
          label={t('mweb.venueChat.showMore')}
          onPress={() => {
            inbox.loadMore().catch(() => undefined);
          }}
          variant="ghost"
          tone="neutral"
          disabled={inbox.loadingMore}
        />
      ) : null}
    </YStack>
  );
}

/**
 * Venue Options → Venue Chat (/venues/chats): the venue picked at the top, then
 * every conversation with the hosts of its pods. A row opens the pod's thread.
 * mWeb twin: pages/venue-chats-page.
 */
export function VenueChatsScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, isLoading, error } = useMyVenues();
  return (
    <StackScreen title={t('mweb.venueChat.inboxTitle')} testID="venue-chats-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <YStack gap={16}>
          <SelectedVenueBar
            venues={venues}
            venue={venue}
            onSelect={selectVenue}
            isLoading={isLoading}
            error={error}
          />
          {venueId ? <VenueChatInbox venueId={venueId} /> : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
