import type { ReactNode } from 'react';
import { Box, Stack } from '@mui/material';
import { DuncitTabs, tabPanelProps, useTabParam } from '@duncit/tabs';
import { useTranslation } from '../../../i18n/useTranslation';
import { SEGMENTED_TABS_SX } from '../../gift-cards-page/segmentedSx';
import type { PublicVenue } from '../queries';
import VenueFoodMenu from './VenueFoodMenu';

type VenueTab = 'menu' | 'events';

interface Props {
  venue: PublicVenue;
  /** What the page shows for a venue with no menu — its pods and reels. */
  events: ReactNode;
  onRefresh: () => Promise<unknown>;
}

const TABS_ID = 'venue';

/**
 * A venue that serves food opens on its Menu — what a guest who scanned the
 * table's QR came for — with its pods one tab away under Events. The tab rides
 * in the URL, so a refresh or a shared link lands on the same one.
 */
export default function VenueFoodTabs({ venue, events, onRefresh }: Readonly<Props>) {
  const { t } = useTranslation();
  const tabs = useTabParam<VenueTab>({
    items: [
      { value: 'menu', label: t('mweb.venueFood.tabMenu'), testId: 'venue-tab-menu' },
      { value: 'events', label: t('mweb.venueFood.tabEvents'), testId: 'venue-tab-events' },
    ],
    fallback: 'menu',
  });

  return (
    <Stack spacing={2} data-testid="venue-food-tabs">
      <DuncitTabs
        {...tabs}
        idPrefix={TABS_ID}
        variant="fullWidth"
        aria-label={t('mweb.venueFood.tabsLabel')}
        sx={SEGMENTED_TABS_SX}
      />
      <Box {...tabPanelProps(TABS_ID, tabs.value)}>
        {tabs.value === 'menu' ? (
          <VenueFoodMenu venue={venue} onRefresh={onRefresh} />
        ) : (
          <Stack spacing={2.5}>{events}</Stack>
        )}
      </Box>
    </Stack>
  );
}
