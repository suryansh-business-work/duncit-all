import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { YStack } from 'tamagui';

import { PillTabs, type PillTab } from '@/components/PillTabs';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { StackScreen } from '@/components/StackScreen';
import { EventRequestsTab } from '@/components/venue-event-requests/EventRequestsTab';
import { SlotRequestHistoryList } from '@/components/venue-event-requests/SlotRequestHistoryList';
import { SlotRequestQueue } from '@/components/venue-slot-requests/SlotRequestQueue';
import { useSlotRequestHistory } from '@/hooks/useSlotRequestHistory';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';

type InboxTab = 'bookings' | 'requests' | 'history';

const TABS: readonly PillTab<InboxTab>[] = [
  { key: 'bookings', labelKey: 'availability.offers.tab' },
  { key: 'requests', labelKey: 'availability.eventInbox.tabRequests' },
  { key: 'history', labelKey: 'availability.eventInbox.tabHistory' },
];

/** Booking requests the venue has already answered. */
function HistoryTab() {
  const history = useSlotRequestHistory();
  return (
    <YStack testID="slot-history-tab">
      <SlotRequestHistoryList
        rows={history.rows}
        isLoading={history.isLoading}
        error={history.error}
      />
    </YStack>
  );
}

/**
 * Workshop & Event Requests — the venue owner's inbox: hosts' booking offers
 * first (Accept / Counter / Reject — a pod goes live only once the venue
 * agrees), then members' event requests, then every booking request already
 * answered. The same three views the Partners console and mWeb show. Native
 * has no URL to hold the tab, so it lives in state (PillTabs).
 */
export function VenueEventRequestsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<InboxTab>('bookings');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <StackScreen title={t('availability.eventInbox.title')} testID="venue-event-requests-screen">
      <PillTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        ariaLabel={t('availability.eventInbox.tabsLabel')}
        testIDPrefix="venue-event-requests-tab"
      />
      <RefreshScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {tab === 'bookings' && (
          <SlotRequestQueue
            onDecided={() => undefined}
            onChat={(podId) => navigation.navigate('VenueChat', { podId })}
          />
        )}
        {tab === 'requests' && <EventRequestsTab />}
        {tab === 'history' && <HistoryTab />}
      </RefreshScrollView>
    </StackScreen>
  );
}
