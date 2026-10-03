import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { actionsColumn, activeChipColumn, dateColumn, type DuncitColumn } from '@duncit/table';
import type { StoreServiceablePincode } from './queries';

const renderPincode = (row: StoreServiceablePincode) => (
  <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
    {row.pincode}
  </Typography>
);

interface PincodeColumnActions {
  onEdit: (pincode: StoreServiceablePincode) => void;
  onDelete: (pincode: StoreServiceablePincode) => void;
}

/** The serviceable-pincode table's columns — every one the server can sort and filter. */
export function useServiceablePincodeColumns({ onEdit, onDelete }: PincodeColumnActions): DuncitColumn<StoreServiceablePincode>[] {
  const { t } = useTranslation();
  return useMemo<DuncitColumn<StoreServiceablePincode>[]>(() => {
    const orDash = (value: string) => value || '—';
    return [
      {
        field: 'pincode',
        headerName: t('ecommPortal.serviceablePincodes.pincode'),
        type: 'text',
        width: 130,
        cellRenderer: renderPincode,
        valueGetter: (row) => row.pincode,
      },
      { field: 'area', headerName: t('ecommPortal.serviceablePincodes.area'), type: 'text', flex: 1, minWidth: 160, valueGetter: (row) => orDash(row.area) },
      { field: 'city', headerName: t('ecommPortal.serviceablePincodes.city'), type: 'text', minWidth: 140, valueGetter: (row) => orDash(row.city) },
      { field: 'state', headerName: t('ecommPortal.serviceablePincodes.state'), type: 'text', minWidth: 140, valueGetter: (row) => orDash(row.state) },
      activeChipColumn<StoreServiceablePincode>(),
      dateColumn<StoreServiceablePincode>(),
      actionsColumn<StoreServiceablePincode>({
        onEdit,
        onDelete,
        edit: { ariaLabel: (row) => t('shell.a11y.editNamed', { vars: { name: row.pincode } }) },
        delete: { ariaLabel: (row) => t('shell.a11y.deleteNamed', { vars: { name: row.pincode } }) },
      }),
    ];
  }, [t, onEdit, onDelete]);
}
