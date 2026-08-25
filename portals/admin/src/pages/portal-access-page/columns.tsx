import { Box, Button, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { StatusChip } from '@duncit/ui';
import type { DuncitColumn } from '@duncit/table';
import { portalNameOf, type PortalAccessRequest } from './helpers';

const renderRequester = (row: PortalAccessRequest) => (
  <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography variant="body2" noWrap component="div" sx={{
      fontWeight: 700
    }}>
      {row.subject_name || '—'}
    </Typography>
    <Typography variant="caption" noWrap component="div" sx={{
      color: "text.secondary"
    }}>
      {row.subject_email || '—'}
    </Typography>
  </Box>
);

const renderStatus = (row: PortalAccessRequest) => <StatusChip status={row.status} />;

interface ColumnDeps {
  t: (key: string) => string;
  formatDateTime: (value: string) => string;
  onApprove: (row: PortalAccessRequest) => void;
  onDeny: (row: PortalAccessRequest) => void;
}

export function getPortalAccessColumns({
  t,
  formatDateTime,
  onApprove,
  onDeny,
}: Readonly<ColumnDeps>): DuncitColumn<PortalAccessRequest>[] {
  const renderActions = (row: PortalAccessRequest) => {
    if (row.status !== 'PENDING') {
      return (
        <Typography variant="caption" component="span" sx={{
          color: "text.secondary"
        }}>
          {row.reviewed_by_name || '—'}
        </Typography>
      );
    }
    return (
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<CheckIcon fontSize="small" />}
          onClick={() => onApprove(row)}
        >
          {t('admin.portalAccess.approve')}
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<CloseIcon fontSize="small" />}
          onClick={() => onDeny(row)}
        >
          {t('admin.portalAccess.deny')}
        </Button>
      </Stack>
    );
  };

  return [
    {
      field: 'subject_name',
      headerName: t('admin.portalAccess.colRequester'),
      flex: 1.2,
      minWidth: 220,
      cellRenderer: renderRequester,
      valueGetter: (row) => row.subject_name ?? '—',
    },
    {
      field: 'portal',
      headerName: t('admin.portalAccess.colPortal'),
      sortable: false,
      minWidth: 150,
      valueGetter: (row) => portalNameOf(row.target_id),
    },
    {
      field: 'created_at',
      headerName: t('admin.portalAccess.colRequestedAt'),
      filter: { type: 'date' },
      width: 180,
      valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : ''),
    },
    {
      field: 'reviewed_at',
      headerName: t('admin.portalAccess.colReviewedAt'),
      filter: { type: 'date' },
      hide: true,
      width: 180,
      valueGetter: (row) => (row.reviewed_at ? formatDateTime(row.reviewed_at) : ''),
    },
    {
      field: 'status',
      headerName: t('admin.portalAccess.colStatus'),
      width: 120,
      cellRenderer: renderStatus,
      valueGetter: (row) => row.status,
    },
    {
      field: 'actions',
      headerName: t('admin.portalAccess.colActions'),
      sortable: false,
      width: 210,
      cellRenderer: renderActions,
    },
  ];
}
