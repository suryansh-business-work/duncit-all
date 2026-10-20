import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { EventRequestRespondActions, SlotRequestHistory } from '@duncit/availability-calendar';
import { EventRequestsPage, useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import SlotRequestsPage from '../slot-requests-page/SlotRequestsPage';

const TABS_ID = 'workshop-event-requests';

/**
 * Workshop & Event Requests — what members asked the venue for, answered with
 * Accept / Reject / Counter offer (a counter is priced by the Venue Pricing
 * Module); and, on its own tab, the slot requests from before hosts booked
 * instantly. A leftover pending one keeps its approve / decline there.
 */
export default function WorkshopEventRequestsPage() {
  const { t } = useTranslation();
  const items = useMemo(
    () => [
      { value: 'requests', label: t('venuePricing.requests.tab'), testId: `${TABS_ID}-tab-requests` },
      { value: 'history', label: t('venuePricing.history.tab'), testId: `${TABS_ID}-tab-history` },
    ],
    [t],
  );
  const tabs = useTabParam({ items, fallback: 'requests' });

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid="workshop-event-requests-page">
      <PageHeader title={t('venuePricing.requests.title')} subtitle={t('venuePricing.requests.subtitle')} />
      <DuncitTabs
        items={items}
        value={tabs.value}
        onChange={tabs.onChange}
        idPrefix={TABS_ID}
        aria-label={t('venuePricing.requests.title')}
        searchable={false}
      />
      <Box {...tabPanelProps(TABS_ID, tabs.value)}>
        {tabs.value === 'requests' ? (
          <EventRequestsPage
            targetType="VENUE"
            scope="owner"
            hideHeader
            renderActions={(row, refresh) => (
              <EventRequestRespondActions request={row} targetType="VENUE" onDone={refresh} />
            )}
          />
        ) : (
          <Stack spacing={2.5}>
            {/* The pending queue keeps the existing approve / decline (and the email deep links). */}
            <SlotRequestsPage />
            <SlotRequestHistory venueId={null} hidePending />
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
