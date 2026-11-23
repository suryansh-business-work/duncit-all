import type { ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { formatDateTime } from '@duncit/app-settings';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import {
  RENTAL_BOOKING_STATUSES,
  RENTAL_REFUND_STATUSES,
  rentalMoney,
  rentalRefundKey,
  rentalStatusKey,
  rentalUnitKey,
  type RentalBookingRow,
} from '@duncit/utils';
import type { Translate } from '../types';
import { RentalRefundStateChip, RentalStatusChip } from './rental-chips';

export const getRentalBookingRowId = (row: RentalBookingRow) => row.id;

export interface RentalColumnOptions {
  /** Finance sees who rented it; the venue sees the same. A guest's own list does not need it. */
  showGuest: boolean;
  /** The row's actions, when the surface has any. */
  renderActions?: (row: RentalBookingRow) => ReactNode;
}

const money = (row: RentalBookingRow, amount: number) => rentalMoney(row.currency_symbol, amount);
/** An amount that is 0 reads as a dash, so the owed money stands out. */
const moneyOrDash = (row: RentalBookingRow, amount: number | null | undefined) =>
  amount != null && amount > 0 ? money(row, amount) : EM_DASH;

/** What the booking is owed back: the server's figure, or the frozen refund on an older server. */
export const rentalRefundEligible = (row: RentalBookingRow) => row.refund_eligible ?? row.refund_due;

function leadColumns(t: Translate, options: RentalColumnOptions): DuncitColumn<RentalBookingRow>[] {
  const columns: DuncitColumn<RentalBookingRow>[] = [
    {
      field: 'created_at',
      headerName: t('venueRentals.table.created'),
      type: 'date',
      width: 170,
      valueGetter: (row) => formatDateTime(row.created_at) || EM_DASH,
    },
    {
      field: 'name',
      headerName: t('venueRentals.table.item'),
      type: 'text',
      minWidth: 180,
      filterable: false,
      cellRenderer: (row) => (
        <Stack component="span" spacing={0}>
          <Typography component="span" variant="body2" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
          <Typography component="span" variant="caption" color="text.secondary">
            {t('venueRentals.guest.units', {
              vars: { quantity: row.quantity, units: row.units, unit: t(rentalUnitKey(row.unit)) },
            })}
          </Typography>
        </Stack>
      ),
    },
    { field: 'pod_title', headerName: t('venueRentals.table.pod'), type: 'text', minWidth: 180, sortable: false, filterable: false },
  ];
  if (options.showGuest) {
    columns.push({
      field: 'guest_name',
      headerName: t('venueRentals.table.guest'),
      type: 'text',
      minWidth: 150,
      sortable: false,
      filterable: false,
    });
  }
  return columns;
}

/** The refund as Razorpay carries it: what is owed, what is still out, what Razorpay confirmed and where it stands. */
function refundColumns(t: Translate): DuncitColumn<RentalBookingRow>[] {
  return [
    {
      // Sorted by the frozen refund_due, the server's sortable twin of the eligible amount.
      field: 'refund_due',
      headerName: t('venueRentals.table.refundEligible'),
      type: 'number',
      width: 140,
      valueGetter: (row) => money(row, rentalRefundEligible(row)),
    },
    {
      field: 'refund_outstanding',
      headerName: t('venueRentals.table.refundOutstanding'),
      type: 'number',
      width: 160,
      sortable: false,
      filterable: false,
      valueGetter: (row) => moneyOrDash(row, row.refund_outstanding),
    },
    {
      field: 'refunded_amount',
      headerName: t('venueRentals.table.refunded'),
      type: 'number',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => moneyOrDash(row, row.refunded_amount),
    },
    {
      field: 'refund_state',
      headerName: t('venueRentals.table.refundState'),
      type: 'text',
      width: 230,
      sortable: false,
      filterable: false,
      cellRenderer: (row) => <RentalRefundStateChip row={row} />,
    },
  ];
}

/** Columns Finance may still want for older bookings, hidden until someone turns them on. */
function legacyColumns(t: Translate): DuncitColumn<RentalBookingRow>[] {
  return [
    {
      // Cash a venue handed back before Duncit refunded deposits through Razorpay.
      field: 'deposit_at_venue',
      headerName: t('venueRentals.table.depositAtVenue'),
      type: 'number',
      width: 160,
      sortable: false,
      filterable: false,
      hide: true,
      valueGetter: (row) => moneyOrDash(row, row.deposit_at_venue),
    },
    {
      field: 'refund_status',
      headerName: t('venueRentals.table.refundStatus'),
      type: 'enum',
      width: 200,
      hide: true,
      options: RENTAL_REFUND_STATUSES.map((value) => ({ value, label: t(rentalRefundKey(value)) })),
      cellRenderer: (row) => <Chip size="small" variant="outlined" label={t(rentalRefundKey(row.refund_status))} />,
    },
  ];
}

/** Every rented item: what was rented for which pod, what it cost, how it closed and who is owed what. */
export function buildRentalBookingColumns(t: Translate, options: RentalColumnOptions): DuncitColumn<RentalBookingRow>[] {
  const columns: DuncitColumn<RentalBookingRow>[] = [
    ...leadColumns(t, options),
    { field: 'rent_amount', headerName: t('venueRentals.table.rent'), type: 'number', width: 120, valueGetter: (row) => money(row, row.rent_amount) },
    { field: 'deposit_amount', headerName: t('venueRentals.table.deposit'), type: 'number', width: 120, valueGetter: (row) => money(row, row.deposit_amount) },
    {
      field: 'status',
      headerName: t('venueRentals.table.status'),
      type: 'enum',
      width: 190,
      options: RENTAL_BOOKING_STATUSES.map((value) => ({ value, label: t(rentalStatusKey(value)) })),
      cellRenderer: (row) => <RentalStatusChip status={row.status} />,
    },
    {
      field: 'damage_claim',
      headerName: t('venueRentals.table.damage'),
      type: 'number',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => moneyOrDash(row, row.damage_claim),
    },
    ...refundColumns(t),
    { field: 'venue_amount', headerName: t('venueRentals.table.venueAmount'), type: 'number', width: 130, valueGetter: (row) => money(row, row.venue_amount) },
    {
      field: 'commission_amount',
      headerName: t('venueRentals.table.commission'),
      type: 'number',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => money(row, row.commission_amount),
    },
    { field: 'payment_ref', headerName: t('venueRentals.table.payment'), type: 'text', width: 170, sortable: false, filterable: false, hide: true },
    ...legacyColumns(t),
  ];
  if (options.renderActions) {
    columns.push({
      field: 'actions',
      headerName: t('venueRentals.table.actions'),
      type: 'actions',
      width: 150,
      cellRenderer: options.renderActions,
    });
  }
  return columns;
}
