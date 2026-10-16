import { useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { useApolloTableFetch } from '@duncit/table';
import { canRecordRentalRefund, type RentalBookingRow } from '@duncit/utils';
import { RENTAL_BOOKINGS_TABLE } from '../documents';
import RentalRefundDialog from './RentalRefundDialog';
import RentalBookingsBoard, { RowAction } from './RentalBookingsBoard';
import { buildRentalBookingColumns } from './rental-booking-columns';

/**
 * Finance > Rented Items: every rental across the platform. Finance's one
 * action is recording a refund it paid; the venue's share leaves through the
 * VENUE_RENTAL payout in Payment Release, never from here.
 */
export default function FinanceRentalBookings() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const updateRowRef = useRef<((row: RentalBookingRow) => void) | null>(null);
  const [refunding, setRefunding] = useState<RentalBookingRow | null>(null);
  const fetchRows = useApolloTableFetch<RentalBookingRow>(client, RENTAL_BOOKINGS_TABLE, 'rentalBookingsTable');

  const columns = useMemo(
    () =>
      buildRentalBookingColumns(t, {
        showGuest: true,
        renderActions: (row) =>
          canRecordRentalRefund(row) ? (
            <RowAction
              label={t('venueRentals.refundAction.action')}
              ariaLabel={t('venueRentals.refundAction.title', { vars: { name: row.name } })}
              onClick={() => setRefunding(row)}
            />
          ) : null,
      }),
    [t]
  );

  return (
    <RentalBookingsBoard tableId="finance-rental-bookings" columns={columns} fetchRows={fetchRows} updateRowRef={updateRowRef}>
      <RentalRefundDialog booking={refunding} onClose={() => setRefunding(null)} onRecorded={(row) => updateRowRef.current?.(row)} />
    </RentalBookingsBoard>
  );
}
