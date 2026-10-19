import { useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';
import { isRentalListEditable } from '@duncit/utils';

import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { PillTabs, type PillTab } from '@/components/PillTabs';
import { useVenueRentalItems } from '@/hooks/useVenueRentalDesk';
import { useTranslation } from '@/hooks/useTranslation';

import { RentalBookingsPanel } from './RentalBookingsPanel';
import { RentalItemsForm } from './RentalItemsForm';

type DeskTab = 'dashboard' | 'items' | 'bookings';

const TABS: readonly PillTab<DeskTab>[] = [
  { key: 'dashboard', labelKey: 'venueRentals.items.dashboardTab' },
  { key: 'items', labelKey: 'venueRentals.items.itemsTab' },
  { key: 'bookings', labelKey: 'venueRentals.items.bookingsTab' },
];

function ItemsTab({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const { venue, config, failed, loading, refetch, save } = useVenueRentalItems(venueId);
  if (loading) return <Spinner size="large" />;
  if (failed || !venue || !config) {
    return (
      <LoadErrorNotice
        testID="rental-items-error"
        message={t('venueRentals.items.loadFailed')}
        retryLabel={t('venueRentals.guest.retry')}
        onRetry={() => {
          refetch().catch(() => undefined);
        }}
      />
    );
  }
  if (!isRentalListEditable(venue)) {
    return (
      <Text role="status" fontSize={13.5} color="$muted" testID="rental-items-not-approved">
        {t('venueRentals.items.notApproved')}
      </Text>
    );
  }
  return <RentalItemsForm key={venue.id} venue={venue} config={config} onSave={save} />;
}

/**
 * A venue's rental desk on the app: its numbers, its items and its bookings,
 * one tab each — the Tamagui twin of @duncit/venue-rentals' VenueRentalDesk.
 */
export function VenueRentalsBody({ venueId }: Readonly<{ venueId: string }>) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DeskTab>('dashboard');
  return (
    <YStack gap={16} testID="venue-rentals-desk">
      <Text role="note" fontSize={13} color="$muted" testID="venue-rentals-deposit-notice">
        {t('venueRentals.desk.depositNotice')}
      </Text>
      <PillTabs
        tabs={TABS}
        value={tab}
        onChange={setTab}
        ariaLabel={t('venueRentals.items.pageTitle')}
        testIDPrefix="venue-rentals-tab"
      />
      {tab === 'items' ? <ItemsTab venueId={venueId} /> : null}
      {tab === 'dashboard' ? <RentalBookingsPanel venueId={venueId} withStats /> : null}
      {tab === 'bookings' ? <RentalBookingsPanel venueId={venueId} withStats={false} /> : null}
    </YStack>
  );
}
