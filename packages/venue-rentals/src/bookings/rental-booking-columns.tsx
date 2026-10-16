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
  type RentalBookingStatus,
  type RentalRefundStatus,
} from '@duncit/utils';
import type { Translate } from '../types';

export const getRentalBookingRowId = (row: RentalBookingRow) => row.id;

type ChipColor = 'default' | 'info' | 'success' | 'warning' | 'error';

const STATUS_COLOR: Record<RentalBookingStatus, ChipColor> = {
  BOOKED: 'info',
  UNAVAILABLE: 'warning',
  CANCELLED: 'default',
  RELEASED: 'default',
  RETURNED: 'success',
  DAMAGED: 'error',
};

const REFUND_COLOR: Record<RentalRefundStatus, ChipColor> = {
  NONE: 'default',
  DUE: 'warning',
  PAID: 'success',
  IN_PAYMENT: 'success',
};

export interface RentalColumnOptions {
  /** Finance sees who rented it; the venue sees the same. A guest's own list does not need it. */
  showGuest: boolean;
  /** The row's actions, when the surface has any. */
  renderActions?: (row: RentalBookingRow) => ReactNode;
}

const money = (row: RentalBookingRow, amount: number) => rentalMoney(row.currency_symbol, amount);

/** Every rented item: what was rented for which pod, what it cost, how it closed and who is owed what. */
export function buildRentalBookingColumns(t: Translate, options: RentalColumnOptions): DuncitColumn<RentalBookingRow>[] {
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
  columns.push(
    { field: 'rent_amount', headerName: t('venueRentals.table.rent'), type: 'number', width: 120, valueGetter: (row) => money(row, row.rent_amount) },
    { field: 'deposit_amount', headerName: t('venueRentals.table.deposit'), type: 'number', width: 120, valueGetter: (row) => money(row, row.deposit_amount) },
    {
      field: 'status',
      headerName: t('venueRentals.table.status'),
      type: 'enum',
      width: 190,
      options: RENTAL_BOOKING_STATUSES.map((value) => ({ value, label: t(rentalStatusKey(value)) })),
      cellRenderer: (row) => <Chip size="small" color={STATUS_COLOR[row.status]} label={t(rentalStatusKey(row.status))} />,
    },
    {
      field: 'damage_claim',
      headerName: t('venueRentals.table.damage'),
      type: 'number',
      width: 130,
      sortable: false,
      filterable: false,
      valueGetter: (row) => (row.damage_claim > 0 ? money(row, row.damage_claim) : EM_DASH),
    },
    { field: 'refund_due', headerName: t('venueRentals.table.refundDue'), type: 'number', width: 130, valueGetter: (row) => money(row, row.refund_due) },
    {
      field: 'refund_status',
      headerName: t('venueRentals.table.refundStatus'),
      type: 'enum',
      width: 200,
      options: RENTAL_REFUND_STATUSES.map((value) => ({ value, label: t(rentalRefundKey(value)) })),
      cellRenderer: (row) => (
        <Chip size="small" variant="outlined" color={REFUND_COLOR[row.refund_status]} label={t(rentalRefundKey(row.refund_status))} />
      ),
    },
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
    { field: 'payment_ref', headerName: t('venueRentals.table.payment'), type: 'text', width: 170, sortable: false, filterable: false, hide: true }
  );
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
