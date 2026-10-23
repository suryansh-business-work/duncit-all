import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { EventRequestRespondActions, SlotRequestHistory } from '@duncit/availability-calendar';
import { EventRequestsPage, useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import BookingRequestsTab from './BookingRequestsTab';

const TABS_ID = 'workshop-event-requests';

/**
 * The venue's requests inbox: hosts' booking offers first (Accept / Counter /
 * Reject — a pod goes live only once the venue agrees), then what members asked
 * the venue for, then every booking request already answered.
 */
export default function WorkshopEventRequestsPage() {
  const { t } = useTranslation();
  const items = useMemo(
    () => [
      { value: 'bookings', label: t('availability.offers.tab'), testId: `${TABS_ID}-tab-bookings` },
      { value: 'requests', label: t('venuePricing.requests.tab'), testId: `${TABS_ID}-tab-requests` },
      { value: 'history', label: t('venuePricing.history.tab'), testId: `${TABS_ID}-tab-history` },
    ],
    [t],
  );
  const tabs = useTabParam({ items, fallback: 'bookings' });

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
        {tabs.value === 'bookings' && <BookingRequestsTab />}
        {tabs.value === 'requests' && (
          <EventRequestsPage
            targetType="VENUE"
            scope="owner"
            hideHeader
            renderActions={(row, refresh) => (
              <EventRequestRespondActions request={row} targetType="VENUE" onDone={refresh} />
            )}
          />
        )}
        {tabs.value === 'history' && <SlotRequestHistory venueId={null} hidePending />}
      </Box>
    </Stack>
  );
}
