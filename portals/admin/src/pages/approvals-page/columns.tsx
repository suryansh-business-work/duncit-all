import { Box, Button, Chip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { StatusChip } from '@duncit/ui';
import type { DuncitColumn } from '@duncit/table';
import { humanizeType, type ApprovalRequest } from './helpers';

const renderSubject = (row: ApprovalRequest) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography variant="body2" fontWeight={700} noWrap component="div">
      {row.subject_name || 'Unnamed'}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap component="div">
      {row.subject_email || '—'}
    </Typography>
  </Box>
);

const renderKind = (row: ApprovalRequest) => {
  if (!row.kind) {
    return (
      <Typography variant="caption" color="text.disabled" component="span">
        —
      </Typography>
    );
  }
  return <Chip label={row.kind} size="small" variant="outlined" color="secondary" />;
};

const renderStatus = (row: ApprovalRequest) => <StatusChip status={row.status} />;

interface ColumnDeps {
  formatDateTime: (s: string) => string;
  onReview: (row: ApprovalRequest) => void;
}

export function getApprovalColumns({ formatDateTime, onReview }: Readonly<ColumnDeps>): DuncitColumn<ApprovalRequest>[] {
  const renderAction = (row: ApprovalRequest) => (
    <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => onReview(row)}>
      Review
    </Button>
  );
  return [
    {
      field: 'subject_name',
      headerName: 'Subject',
      flex: 1.3,
      minWidth: 240,
      cellRenderer: renderSubject,
      valueGetter: (row) => row.subject_name ?? 'Unnamed',
    },
    {
      field: 'kind',
      headerName: 'Kind',
      filter: { type: 'text' },
      width: 130,
      cellRenderer: renderKind,
      valueGetter: (row) => row.kind ?? '—',
    },
    {
      field: 'type',
      headerName: 'Type',
      filter: { type: 'text' },
      hide: true,
      minWidth: 170,
      valueGetter: (row) => humanizeType(row.type),
    },
    {
      field: 'source_portal',
      headerName: 'Source portal',
      filter: { type: 'text' },
      width: 150,
      valueGetter: (row) => row.source_portal || '—',
    },
    {
      field: 'requested_by_name',
      headerName: 'Requested by',
      flex: 1,
      minWidth: 160,
      valueGetter: (row) => row.requested_by_name || '—',
    },
    {
      field: 'created_at',
      headerName: 'Requested at',
      filter: { type: 'date' },
      width: 180,
      valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : ''),
    },
    {
      field: 'reviewed_at',
      headerName: 'Reviewed at',
      filter: { type: 'date' },
      hide: true,
      width: 180,
      valueGetter: (row) => (row.reviewed_at ? formatDateTime(row.reviewed_at) : ''),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    { field: 'actions', headerName: 'Action', sortable: false, width: 130, cellRenderer: renderAction },
  ];
}
