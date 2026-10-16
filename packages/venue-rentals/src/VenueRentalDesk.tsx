import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitTabs, TAB_PARAM, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import type { UploadSurface } from '@duncit/media-picker';
import VenueRentalBookings from './bookings/VenueRentalBookings';
import VenueRentalStatsTiles from './dashboard/VenueRentalStats';
import VenueRentalItems from './items/VenueRentalItems';

type DeskTab = 'dashboard' | 'items' | 'bookings';

/** Its own URL key: the desk can sit inside another strip (the Venues console's venue record). */
const DESK_TAB_PARAM = `${TAB_PARAM}_rentals`;

export interface VenueRentalDeskProps {
  venueId: string;
  /** The mounting surface's id prefix (`partners-app`, `venues`, `mweb`). */
  surface: string;
  mode: 'owner' | 'admin';
  uploadSurface?: UploadSurface;
}

/**
 * A venue's whole rental desk on one page: its numbers, its items and its
 * bookings, one URL-selected tab each, so a link can open straight on the
 * bookings to mark.
 */
export default function VenueRentalDesk({ venueId, surface, mode, uploadSurface }: Readonly<VenueRentalDeskProps>) {
  const { t } = useTranslation();
  const idPrefix = `${surface}-rental-desk`;
  const items = useMemo<DuncitTabItem<DeskTab>[]>(
    () => [
      { value: 'dashboard', label: t('venueRentals.items.dashboardTab') },
      { value: 'items', label: t('venueRentals.items.itemsTab') },
      { value: 'bookings', label: t('venueRentals.items.bookingsTab') },
    ],
    [t]
  );
  const tabs = useTabParam<DeskTab>({ items, fallback: 'dashboard', param: DESK_TAB_PARAM });

  return (
    <Stack spacing={2}>
      <DuncitTabs {...tabs} idPrefix={idPrefix} />
      <Box {...tabPanelProps(idPrefix, tabs.value)}>
        {tabs.value === 'dashboard' && (
          <Stack spacing={2}>
            <VenueRentalStatsTiles venueId={venueId} />
            <VenueRentalBookings venueId={venueId} surface={surface} />
          </Stack>
        )}
        {tabs.value === 'items' && (
          <VenueRentalItems venueId={venueId} surface={surface} mode={mode} uploadSurface={uploadSurface} />
        )}
        {tabs.value === 'bookings' && <VenueRentalBookings venueId={venueId} surface={surface} />}
      </Box>
    </Stack>
  );
}
