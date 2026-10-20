import { useState } from 'react';
import { YStack } from 'tamagui';

import { PillTabs, type PillTab } from '@/components/PillTabs';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { SectionHeader } from '@/components/SectionHeader';
import { StackScreen } from '@/components/StackScreen';
import { EventRequestsTab } from '@/components/venue-event-requests/EventRequestsTab';
import { SlotRequestHistoryList } from '@/components/venue-event-requests/SlotRequestHistoryList';
import { SlotRequestQueue } from '@/components/venue-slot-requests/SlotRequestQueue';
import { useSlotRequestHistory } from '@/hooks/useSlotRequestHistory';
import { useTranslation } from '@/hooks/useTranslation';

type InboxTab = 'requests' | 'history';

const TABS: readonly PillTab<InboxTab>[] = [
  { key: 'requests', labelKey: 'availability.eventInbox.tabRequests' },
  { key: 'history', labelKey: 'availability.eventInbox.tabHistory' },
];

/** Old slot requests: the PENDING ones still answerable, then the answered ones. */
function SlotHistoryTab() {
  const { t } = useTranslation();
  const history = useSlotRequestHistory();
  return (
    <YStack gap={20} testID="slot-history-tab">
      <SectionHeader title={t('availability.eventInbox.history.pendingTitle')} />
      <SlotRequestQueue
        onDecided={() => {
          history.refetch().catch(() => undefined);
        }}
      />
      <SlotRequestHistoryList
        rows={history.rows}
        isLoading={history.isLoading}
        error={history.error}
      />
    </YStack>
  );
}

/**
 * Workshop & Event Requests — the venue owner's inbox since instant booking:
 * members' event requests (Accept / Reject / Counter offer), and the slot
 * requests from before it, read-only apart from any still waiting. Replaces
 * the old Slot Requests screen and the console-only Event Requests item.
 * Native has no URL to hold the tab, so it lives in state (PillTabs).
 */
export function VenueEventRequestsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<InboxTab>('requests');

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
        {tab === 'requests' ? <EventRequestsTab /> : <SlotHistoryTab />}
      </RefreshScrollView>
    </StackScreen>
  );
}
