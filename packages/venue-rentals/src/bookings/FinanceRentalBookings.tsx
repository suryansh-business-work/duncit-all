import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useApolloTableFetch } from '@duncit/table';
import type { RentalBookingRow } from '@duncit/utils';
import { RENTAL_BOOKINGS_TABLE } from '../documents';
import type { RentalDetailOptions } from './detail/RentalDetailDrawer';
import RentalBookingsBoard from './RentalBookingsBoard';

/**
 * Finance > Rented Items: every rental across the platform. Every refund is
 * sent through Razorpay by Duncit on its own; Finance opens a rental to see
 * where its refund stands and sends one through Razorpay only when it waits
 * for review. Nothing is ever marked refunded by hand. The venue's share
 * leaves through the VENUE_RENTAL payout in Payment Release, never from here.
 */
export default function FinanceRentalBookings({ links, uploadSurface }: Readonly<RentalDetailOptions>) {
  const client = useApolloClient();
  const updateRowRef = useRef<((row: RentalBookingRow) => void) | null>(null);
  const fetchRows = useApolloTableFetch<RentalBookingRow>(client, RENTAL_BOOKINGS_TABLE, 'rentalBookingsTable');
  const detail = useMemo(() => ({ links, uploadSurface }), [links, uploadSurface]);

  return <RentalBookingsBoard tableId="finance-rental-bookings" fetchRows={fetchRows} updateRowRef={updateRowRef} detail={detail} />;
}
