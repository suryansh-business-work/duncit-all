import type { MutableRefObject, ReactNode } from 'react';
import { Card, CardContent } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import type { RentalBookingRow } from '@duncit/utils';
import { getRentalBookingRowId } from './rental-booking-columns';

interface Props {
  tableId: string;
  columns: DuncitColumn<RentalBookingRow>[];
  fetchRows: TableFetch<RentalBookingRow>;
  /** Lets a dialog put the server's answer into its row without a reload. */
  updateRowRef: MutableRefObject<((row: RentalBookingRow) => void) | null>;
  /** The board's dialogs. */
  children?: ReactNode;
}

/** The rental bookings table as every desk shows it; the surface brings its columns' action and its dialog. */
export default function RentalBookingsBoard({ tableId, columns, fetchRows, updateRowRef, children }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <DuncitTable<RentalBookingRow>
          tableId={tableId}
          ariaLabel={t('venueRentals.table.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRentalBookingRowId}
          emptyText={t('venueRentals.table.empty')}
          defaultSort={{ field: 'created_at', dir: 'desc' }}
          searchPlaceholder={t('venueRentals.table.search')}
          updateRowRef={updateRowRef}
        />
      </CardContent>
      {children}
    </Card>
  );
}

/** A row's one action button, named for the item it acts on. */
export function RowAction({ label, ariaLabel, onClick }: Readonly<{ label: string; ariaLabel: string; onClick: () => void }>) {
  return (
    <DuncitButton size="small" variant="contained" aria-label={ariaLabel} onClick={onClick}>
      {label}
    </DuncitButton>
  );
}
