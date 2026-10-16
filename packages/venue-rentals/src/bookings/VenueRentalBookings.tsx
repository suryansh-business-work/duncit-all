import { useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { useApolloTableFetch } from '@duncit/table';
import { canMarkRental, type RentalBookingRow } from '@duncit/utils';
import { VENUE_RENTAL_BOOKINGS_TABLE } from '../documents';
import type { VenueRentalProps } from '../types';
import MarkRentalDialog from './MarkRentalDialog';
import RentalBookingsBoard, { RowAction } from './RentalBookingsBoard';
import { buildRentalBookingColumns } from './rental-booking-columns';

/**
 * A venue's rental bookings: what guests rented for which pod, and the one
 * action the venue owns: marking an item back, or damaged.
 */
export default function VenueRentalBookings({ venueId, surface }: Readonly<VenueRentalProps>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const updateRowRef = useRef<((row: RentalBookingRow) => void) | null>(null);
  const [marking, setMarking] = useState<RentalBookingRow | null>(null);
  const fetchRows = useApolloTableFetch<RentalBookingRow>(
    client,
    VENUE_RENTAL_BOOKINGS_TABLE,
    'venueRentalBookingsTable',
    { extraVariables: { venue_id: venueId } },
    [venueId]
  );

  const columns = useMemo(
    () =>
      buildRentalBookingColumns(t, {
        showGuest: true,
        renderActions: (row) =>
          canMarkRental(row) ? (
            <RowAction
              label={t('venueRentals.mark.action')}
              ariaLabel={t('venueRentals.mark.title', { vars: { name: row.name } })}
              onClick={() => setMarking(row)}
            />
          ) : null,
      }),
    [t]
  );

  return (
    <RentalBookingsBoard
      tableId={`${surface}-venue-rental-bookings`}
      columns={columns}
      fetchRows={fetchRows}
      updateRowRef={updateRowRef}
    >
      <MarkRentalDialog booking={marking} onClose={() => setMarking(null)} onMarked={(row) => updateRowRef.current?.(row)} />
    </RentalBookingsBoard>
  );
}
