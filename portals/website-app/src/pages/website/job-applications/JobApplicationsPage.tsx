import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitIconButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import ApplicationDetailsDialog from './ApplicationDetailsDialog';
import {
  JOB_APPLICATIONS_TABLE,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_COLOR,
  UPDATE_JOB_APPLICATION_STATUS,
  type JobApplication,
} from './queries';
import { useTranslation } from '@duncit/shell';

const getApplicationRowId = (row: JobApplication) => row.id;

const STATUS_OPTIONS = JOB_APPLICATION_STATUSES.map((status) => ({
  value: status,
  label: status,
}));

const renderStatus = (row: JobApplication) => (
  <StatusChip status={row.status} colorMap={JOB_APPLICATION_STATUS_COLOR} />
);

/** Careers-page applications ("Open roles" submissions) — triage inbox. */
export default function JobApplicationsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_JOB_APPLICATION_STATUS, {
    onCompleted: () => refetchRef.current?.(),
  });
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState<JobApplication | null>(null);

  const fetchRows = useApolloTableFetch<JobApplication>(client, JOB_APPLICATIONS_TABLE, 'jobApplicationsTable');

  const columns = useMemo<DuncitColumn<JobApplication>[]>(() => {
    const renderActions = (row: JobApplication) => (
      <DuncitIconButton size="small" onClick={() => setOpen(row)} aria-label={t('shell.common.view')}>
        <VisibilityIcon fontSize="small" />
      </DuncitIconButton>
    );
    return [
      {
        field: 'role_title',
        headerName: t('websiteApp.jobs.colRole'),
        filter: { type: 'text' },
        flex: 1,
        minWidth: 160,
      },
      { field: 'name', headerName: t('shell.common.name'), flex: 1, minWidth: 150 },
      { field: 'email', headerName: t('shell.common.email'), flex: 1, minWidth: 200 },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'created_at',
        headerName: t('websiteApp.jobs.colReceived'),
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        width: 70,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDateTime]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" sx={{
        fontWeight: 700
      }}>
        Job Applications
      </Typography>
      <DuncitTable<JobApplication>
        tableId="website-job-applications"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getApplicationRowId}
        onRowClick={setOpen}
        emptyText={t('websiteApp.jobs.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search role, name or email"
        refetchRef={refetchRef}
      />
      <ApplicationDetailsDialog
        application={open}
        onClose={() => setOpen(null)}
        onUpdateStatus={(id, s) => {
          updateStatus({ variables: { id, status: s } }).catch(() => undefined);
          setOpen(null);
        }}
      />
    </Stack>
  );
}
