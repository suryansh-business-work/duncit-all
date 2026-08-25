import { Box, Button, Chip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { StatusChip } from '@duncit/ui';
import type { DuncitColumn } from '@duncit/table';
import { humanizeType, type ApprovalRequest } from './helpers';

const renderSubject = (row: ApprovalRequest) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography variant="body2" noWrap component="div" sx={{
      fontWeight: 700
    }}>
      {row.subject_name || 'Unnamed'}
    </Typography>
    <Typography variant="caption" noWrap component="div" sx={{
      color: "text.secondary"
    }}>
      {row.subject_email || '—'}
    </Typography>
  </Box>
);

const renderKind = (row: ApprovalRequest) => {
  if (!row.kind) {
    return (
      <Typography variant="caption" component="span" sx={{
        color: "text.disabled"
      }}>—
              </Typography>
    );
  }
  return <Chip label={row.kind} size="small" variant="outlined" color="secondary" />;
};

const renderStatus = (row: ApprovalRequest) => <StatusChip status={row.status} />;

interface ColumnDeps {
  /** Column headings are copy — the page hands its translator down. */
  t: (key: string) => string;
  formatDateTime: (s: string) => string;
  onReview: (row: ApprovalRequest) => void;
}

export function getApprovalColumns({ formatDateTime, onReview, t }: Readonly<ColumnDeps>): DuncitColumn<ApprovalRequest>[] {
  const renderAction = (row: ApprovalRequest) => (
    <Button size="small" startIcon={<VisibilityIcon fontSize="small" />} onClick={() => onReview(row)}>
      {t('admin.verification.review')}
    </Button>
  );
  return [
    {
      field: 'subject_name',
      headerName: t('admin.contact.subject'),
      flex: 1.3,
      minWidth: 240,
      cellRenderer: renderSubject,
      valueGetter: (row) => row.subject_name ?? 'Unnamed',
    },
    {
      field: 'kind',
      headerName: t('admin.approvals.colKind'),
      filter: { type: 'text' },
      width: 130,
      cellRenderer: renderKind,
      valueGetter: (row) => row.kind ?? '—',
    },
    {
      field: 'type',
      headerName: t('admin.roles.type'),
      filter: { type: 'text' },
      hide: true,
      minWidth: 170,
      valueGetter: (row) => humanizeType(row.type),
    },
    {
      field: 'source_portal',
      headerName: t('admin.approvals.colSourcePortal'),
      filter: { type: 'text' },
      width: 150,
      valueGetter: (row) => row.source_portal || '—',
    },
    {
      field: 'requested_by_name',
      headerName: t('admin.approvals.colRequestedBy'),
      flex: 1,
      minWidth: 160,
      valueGetter: (row) => row.requested_by_name || '—',
    },
    {
      field: 'created_at',
      headerName: t('admin.approvals.colRequestedAt'),
      filter: { type: 'date' },
      width: 180,
      valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : ''),
    },
    {
      field: 'reviewed_at',
      headerName: t('admin.approvals.colReviewedAt'),
      filter: { type: 'date' },
      hide: true,
      width: 180,
      valueGetter: (row) => (row.reviewed_at ? formatDateTime(row.reviewed_at) : ''),
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      width: 130,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    { field: 'actions', headerName: t('admin.activity.action'), sortable: false, width: 130, cellRenderer: renderAction },
  ];
}
