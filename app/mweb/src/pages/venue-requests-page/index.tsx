import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import { SlotRequestHistory, VenueEventRequestList } from '@duncit/availability-calendar';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import BookingRequests from '../venue-slot-requests-page';

const TABS_ID = 'venue-requests';

/**
 * The venue owner's requests inbox on their phone — the same three views the
 * Partners console shows: hosts' booking offers (Accept / Counter / Reject),
 * members' workshop and event requests, and every booking request answered.
 */
export default function VenueRequestsPage() {
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
        {tabs.value === 'bookings' && <BookingRequests />}
        {tabs.value === 'requests' && <VenueEventRequestList />}
        {tabs.value === 'history' && <SlotRequestHistory venueId={null} hidePending />}
      </Box>
    </Stack>
  );
}
