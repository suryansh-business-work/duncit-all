import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { SlotRequestHistory, VenueEventRequestList } from '@duncit/availability-calendar';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import PendingSlotRequests from '../venue-slot-requests-page';

const TABS_ID = 'venue-requests';

/**
 * Workshop & Event Requests, for a venue owner on their phone — the same two
 * views the Partners console shows: members' event requests (Accept / Reject /
 * Counter offer, priced by the Venue Pricing Module), and the slot requests
 * from before instant booking, where a pending one can still be answered.
 */
export default function VenueRequestsPage() {
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
    <Stack spacing={2} sx={{ p: 2 }} data-testid="venue-requests-page">
      <StudioPageHeader icon={<EventAvailableRoundedIcon fontSize="small" />} title={t('venuePricing.requests.title')} />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('venuePricing.requests.subtitle')}
      </Typography>
      <DuncitTabs
        items={items}
        value={tabs.value}
        onChange={tabs.onChange}
        idPrefix={TABS_ID}
        aria-label={t('venuePricing.requests.title')}
      />
      <Box {...tabPanelProps(TABS_ID, tabs.value)}>
        {tabs.value === 'requests' ? (
          <VenueEventRequestList />
        ) : (
          <Stack spacing={2.5}>
            <PendingSlotRequests />
            <SlotRequestHistory venueId={null} hidePending />
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
