import { useMemo } from 'react';
import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { DataGrid, type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import EditIcon from '@mui/icons-material/Edit';
import EmailIcon from '@mui/icons-material/Email';
import CallIcon from '@mui/icons-material/Call';
import DeleteIcon from '@mui/icons-material/Delete';
import { format } from 'date-fns';
import type { HostLead } from '../../api/crm.types';
import { PriorityChip, StatusChip } from '../../components/StatusChips';

interface Props {
  leads: HostLead[];
  loading?: boolean;
  onView: (lead: HostLead) => void;
  onEdit: (lead: HostLead) => void;
  onEmail: (lead: HostLead) => void;
  onCall: (lead: HostLead) => void;
  onDelete: (lead: HostLead) => void;
}

const fmt = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : format(date, 'dd MMM yyyy');
};

export default function HostLeadsTable({ leads, loading, onView, onEdit, onEmail, onCall, onDelete }: Props) {
  const columns = useMemo<GridColDef<HostLead>[]>(
    () => [
      {
        field: 'host_name',
        headerName: 'Host',
        flex: 1.4,
        minWidth: 200,
        renderCell: (params: GridRenderCellParams<HostLead>) => (
          <Stack sx={{ py: 0.5 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{params.row.host_name}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {params.row.contacts?.[0]?.mobile_number || '—'}
            </Typography>
          </Stack>
        ),
      },
      { field: 'host_type', headerName: 'Type', minWidth: 120, flex: 0.6, valueGetter: (_v, row) => row.host_type ?? '—' },
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
        minWidth: 220,
        renderCell: (params) => (
          // stopPropagation so action clicks don't bubble to the row's
          // onRowClick (which navigates to detail view).
          <Stack
            direction="row"
            spacing={0.5}
            justifyContent="flex-end"
            onClick={(e) => e.stopPropagation()}
          >
            {/* "Details" eye icon removed — the entire row is clickable. */}
            <Tooltip title="Email"><IconButton size="small" onClick={() => onEmail(params.row)}><EmailIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Call"><IconButton size="small" onClick={() => onCall(params.row)}><CallIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Edit"><IconButton size="small" onClick={() => onEdit(params.row)}><EditIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => onDelete(params.row)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          </Stack>
        ),
      },
    ],
    [onView, onEdit, onEmail, onCall, onDelete]
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
