import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { useApolloTableFetch } from '@duncit/table';
import { canMarkRental, type RentalBookingRow } from '@duncit/utils';
import { VENUE_RENTAL_BOOKINGS_TABLE } from '../documents';
import type { VenueRentalProps } from '../types';
import type { RentalDetailOptions } from './detail/RentalDetailDrawer';
import MarkRentalDialog from './MarkRentalDialog';
import RentalBookingsBoard, { RowAction } from './RentalBookingsBoard';

export type VenueRentalBookingsProps = VenueRentalProps & RentalDetailOptions;

/**
 * A venue's rental bookings: what guests rented for which pod, the one action
 * the venue owns (marking an item back, or damaged), and each rental's detail
 * with its refund and the optional proof the venue may add.
 */
export default function VenueRentalBookings({ venueId, surface, links, uploadSurface }: Readonly<VenueRentalBookingsProps>) {
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
  const detail = useMemo(() => ({ links, uploadSurface }), [links, uploadSurface]);

  const renderActions = useCallback(
    (row: RentalBookingRow) =>
      canMarkRental(row) ? (
        <RowAction
          label={t('venueRentals.mark.action')}
          ariaLabel={t('venueRentals.mark.title', { vars: { name: row.name } })}
          onClick={() => setMarking(row)}
        />
      ) : null,
    [t]
  );

  return (
    <RentalBookingsBoard
      tableId={`${surface}-venue-rental-bookings`}
      fetchRows={fetchRows}
      updateRowRef={updateRowRef}
      renderActions={renderActions}
      detail={detail}
    >
      <MarkRentalDialog booking={marking} onClose={() => setMarking(null)} onMarked={(row) => updateRowRef.current?.(row)} />
    </RentalBookingsBoard>
  );
}
