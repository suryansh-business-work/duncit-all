import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { STATUS_COLORS, type ApprovalRequest, type ApprovalStatus } from './helpers';

interface ColumnDeps {
  formatDateTime: (s: string) => string;
  onReview: (row: ApprovalRequest) => void;
}

export function getApprovalColumns({ formatDateTime, onReview }: ColumnDeps): GridColDef[] {
  return [
    {
      field: 'subject_name',
      headerName: 'Subject',
      flex: 1.3,
      minWidth: 240,
      renderCell: (p) => {
        const row = p.row as ApprovalRequest;
        return (
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {row.subject_name || 'Unnamed'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {row.subject_email || '—'}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: 'kind',
      headerName: 'Kind',
      width: 120,
      renderCell: (p) => {
        const kind = (p.value as string) || null;
        if (!kind) {
          return (
            <Typography variant="caption" color="text.disabled">
              —
            </Typography>
          );
        }
        return <Chip label={kind} size="small" variant="outlined" color="secondary" />;
      },
    },
    {
      field: 'source_portal',
      headerName: 'Source portal',
      width: 150,
      valueFormatter: (v) => (v as string) || '—',
    },
    {
      field: 'requested_by_name',
      headerName: 'Requested by',
      flex: 1,
      minWidth: 160,
      valueFormatter: (v) => (v as string) || '—',
    },
    {
      field: 'created_at',
      headerName: 'Requested at',
      width: 180,
      valueFormatter: (v) => (v ? formatDateTime(v as string) : ''),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (p) => {
        const status = p.value as ApprovalStatus;
        return <Chip label={status} size="small" color={STATUS_COLORS[status]} />;
      },
    },
    {
      field: 'actions',
      headerName: 'Action',
      width: 130,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" alignItems="center" sx={{ height: '100%' }}>
          <Button
            size="small"
            startIcon={<VisibilityIcon fontSize="small" />}
            onClick={(e) => {
              e.stopPropagation();
              onReview(p.row as ApprovalRequest);
            }}
          >
            Review
          </Button>
        </Stack>
      ),
    },
  ];
}
