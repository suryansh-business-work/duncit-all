import { useMemo } from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams, type GridRowSelectionModel } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { EcommLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';

interface Props {
  leads: EcommLead[];
  loading?: boolean;
  onView: (lead: EcommLead) => void;
  onEdit: (lead: EcommLead) => void;
  onDelete: (lead: EcommLead) => void;
  /** Selected row ids for bulk actions (checkbox column). */
  selectionModel?: GridRowSelectionModel;
  onSelectionChange?: (ids: string[]) => void;
}

const fmt = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yyyy');
};

export default function EcommLeadsTable({ leads, loading, onView, onEdit, onDelete, selectionModel, onSelectionChange }: Readonly<Props>) {
  const columns = useMemo<GridColDef<EcommLead>[]>(
    () => [
      {
        field: 'seller_name',
        headerName: 'Seller',
        flex: 1.4,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<EcommLead>) => (
          <Stack sx={{ py: 0.5 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{params.row.seller_name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.contacts?.[0]?.mobile_number || '—'}
            </Typography>
          </Stack>
        ),
      },
      { field: 'brand_name', headerName: 'Brand', minWidth: 130, flex: 0.7, valueGetter: (_v, row) => row.brand_name || '—' },
      { field: 'city', headerName: 'City', minWidth: 120, flex: 0.6, valueGetter: (_v, row) => row.city ?? '—' },
      {
        field: 'lead_status',
        headerName: 'Status',
        minWidth: 130,
        flex: 0.7,
        renderCell: (params) => <StatusChip value={params.row.lead_status} />,
      },
      {
        field: 'priority',
        headerName: 'Priority',
        minWidth: 110,
        flex: 0.5,
        renderCell: (params) => <PriorityChip value={params.row.priority} />,
      },
      {
        field: 'next_follow_up_date',
        headerName: 'Follow-up',
        minWidth: 140,
        flex: 0.6,
        valueGetter: (_v, row) => row.next_follow_up_date ?? '',
        valueFormatter: (value) => fmt(value as string),
      },
      {
        field: 'actions',
        headerName: 'Actions',
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        align: 'right',
        headerAlign: 'right',
        minWidth: 120,
        renderCell: (params) => (
          // stopPropagation so action clicks don't bubble to the row's
          // onRowClick (which opens the detail view).
          <Stack direction="row" spacing={0.5} justifyContent="flex-end" onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(params.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(params.row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Stack>
        ),
      },
    ],
    [onView, onEdit, onDelete]
  );

  return (
    <DataGrid
      autoHeight
      rows={leads}
      columns={columns}
      loading={loading}
      getRowId={(row) => row.id}
      pageSizeOptions={[10, 25, 50, 100]}
      initialState={{
        pagination: { paginationModel: { pageSize: 25, page: 0 } },
        sorting: { sortModel: [{ field: 'next_follow_up_date', sort: 'asc' }] },
      }}
      checkboxSelection
      rowSelectionModel={selectionModel}
      onRowSelectionModelChange={(model) => onSelectionChange?.(model as string[])}
      disableRowSelectionOnClick
      onRowClick={(params) => onView(params.row)}
      density="standard"
      rowHeight={56}
      sx={{
        cursor: 'pointer',
        '& .MuiDataGrid-cell': { display: 'flex', alignItems: 'center', py: 1 },
        '& .MuiDataGrid-row:hover': { bgcolor: 'action.hover' },
      }}
    />
  );
}
