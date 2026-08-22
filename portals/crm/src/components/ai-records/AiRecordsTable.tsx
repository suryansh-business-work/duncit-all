import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Box } from '@mui/material';
import { useTranslation } from '@duncit/shell';

export interface AiRow {
  _id: number;
  name: string;
  city: string;
  full_address: string;
  mobile: string;
  email: string;
  lead_status: string;
  priority: string;
  /** The full parsed record, carried through to build the create input. */
  _raw: Record<string, any>;
  /** Per-row save error, shown inline after a failed Confirm. */
  _error?: string;
}

interface Props {
  entity: 'VENUE_LEAD' | 'HOST_LEAD';
  rows: AiRow[];
  onChange: (rows: AiRow[]) => void;
}

/** Editable grid of AI-parsed leads. Confirm in the dialog bulk-creates them. */
export default function AiRecordsTable({ entity, rows, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns: GridColDef<AiRow>[] = [
    { field: 'name', headerName: entity === 'VENUE_LEAD' ? 'Venue name' : 'Host name', flex: 1.2, minWidth: 160, editable: true },
    { field: 'city', headerName: t('crm.common.city'), flex: 0.8, minWidth: 110, editable: true },
    ...(entity === 'VENUE_LEAD'
      ? [{ field: 'full_address', headerName: t('crm.common.address'), flex: 1.2, minWidth: 160, editable: true } as GridColDef<AiRow>]
      : []),
    { field: 'mobile', headerName: t('crm.components.mobile'), flex: 0.8, minWidth: 120, editable: true },
    { field: 'email', headerName: t('shell.common.email'), flex: 1, minWidth: 150, editable: true },
    { field: 'lead_status', headerName: t('shell.common.status'), flex: 0.7, minWidth: 110, editable: true },
    { field: 'priority', headerName: t('crm.common.priority'), flex: 0.6, minWidth: 100, editable: true },
    { field: '_error', headerName: t('crm.components.issue'), flex: 1, minWidth: 140 },
  ];

  return (
    <Box sx={{ width: '100%' }}>
      <DataGrid
        autoHeight
        rows={rows}
        columns={columns}
        getRowId={(r) => r._id}
        density="compact"
        hideFooterSelectedRowCount
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
        processRowUpdate={(updated) => {
          onChange(rows.map((r) => (r._id === updated._id ? (updated as AiRow) : r)));
          return updated;
        }}
        getRowClassName={(p) => ((p.row as AiRow)._error ? 'row-error' : '')}
        sx={{ '& .row-error': { bgcolor: 'error.light', opacity: 0.9 } }}
      />
    </Box>
  );
}
