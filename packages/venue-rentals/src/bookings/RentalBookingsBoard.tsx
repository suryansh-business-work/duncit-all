import { useCallback, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import { Card, CardContent, Stack } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, type TableFetch } from '@duncit/table';
import type { RentalBookingRow } from '@duncit/utils';
import RentalDetailDrawer, { type RentalDetailOptions } from './detail/RentalDetailDrawer';
import { useRentalParam } from './detail/useRentalParam';
import { buildRentalBookingColumns, getRentalBookingRowId } from './rental-booking-columns';

interface Props {
  tableId: string;
  fetchRows: TableFetch<RentalBookingRow>;
  /** Lets a dialog put the server's answer into its row without a reload. Memoise it. */
  updateRowRef: MutableRefObject<((row: RentalBookingRow) => void) | null>;
  /** The surface's own row action beside Open (the venue's Mark). Memoise it. */
  renderActions?: (row: RentalBookingRow) => ReactNode;
  /** Where the rental detail's links go and how its proof photos upload. */
  detail?: RentalDetailOptions;
  /** The board's dialogs. */
  children?: ReactNode;
}

/**
 * The rental bookings table as every desk shows it. A row (click, Enter on a
 * focused cell, or its Open button) opens that rental's detail, addressed by
 * `?rental=<id>` so a reload or a shared link lands on the same rental.
 */
export default function RentalBookingsBoard({ tableId, fetchRows, updateRowRef, renderActions, detail, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const [rentalId, setRentalId] = useRentalParam();
  // The setter changes with the URL; the columns must not rebuild every time a rental opens.
  const setRentalIdRef = useRef(setRentalId);
  useEffect(() => {
    setRentalIdRef.current = setRentalId;
  }, [setRentalId]);
  const open = useCallback((row: RentalBookingRow) => setRentalIdRef.current(row.id), []);

  const columns = useMemo(
    () =>
      buildRentalBookingColumns(t, {
        showGuest: true,
        renderActions: (row) => (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DuncitIconButton size="small" aria-label={t('venueRentals.table.open', { vars: { name: row.name } })} onClick={() => open(row)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </DuncitIconButton>
            {renderActions?.(row)}
          </Stack>
        ),
      }),
    [t, open, renderActions]
  );

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <DuncitTable<RentalBookingRow>
          tableId={tableId}
          ariaLabel={t('venueRentals.table.title')}
          columns={columns}
          fetchRows={fetchRows}
          getRowId={getRentalBookingRowId}
          onRowClick={open}
          emptyText={t('venueRentals.table.empty')}
          defaultSort={{ field: 'created_at', dir: 'desc' }}
          searchPlaceholder={t('venueRentals.table.search')}
          updateRowRef={updateRowRef}
        />
      </CardContent>
      {children}
      <RentalDetailDrawer
        rentalId={rentalId}
        onClose={() => setRentalId(null)}
        onBookingChange={(row) => updateRowRef.current?.(row)}
        links={detail?.links}
        uploadSurface={detail?.uploadSurface}
      />
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
