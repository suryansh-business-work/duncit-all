import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Chip, IconButton, Stack, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitTable, tableQueryToGql, type DuncitColumn, type TableQueryState } from '@duncit/table';
import { useDateFormat } from '../../../utils/dateFormat';
import ApplicationDetailsDialog from './ApplicationDetailsDialog';
import {
  JOB_APPLICATIONS_TABLE,
  JOB_APPLICATION_STATUSES,
  JOB_APPLICATION_STATUS_COLOR,
  UPDATE_JOB_APPLICATION_STATUS,
  type JobApplication,
} from './queries';

const getApplicationRowId = (row: JobApplication) => row.id;

const STATUS_OPTIONS = JOB_APPLICATION_STATUSES.map((status) => ({
  value: status,
  label: status,
}));

const renderStatus = (row: JobApplication) => (
  <Chip size="small" label={row.status} color={JOB_APPLICATION_STATUS_COLOR[row.status]} />
);

/** Careers-page applications ("Open roles" submissions) — triage inbox. */
export default function JobApplicationsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_JOB_APPLICATION_STATUS, {
    onCompleted: () => refetchRef.current?.(),
  });
  const { formatDateTime } = useDateFormat();
  const [open, setOpen] = useState<JobApplication | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: JOB_APPLICATIONS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.jobApplicationsTable.rows as JobApplication[],
        total: data.jobApplicationsTable.total as number,
      };
    },
    [client],
  );

  const columns = useMemo<DuncitColumn<JobApplication>[]>(() => {
    const renderActions = (row: JobApplication) => (
      <IconButton size="small" onClick={() => setOpen(row)} aria-label="view">
        <VisibilityIcon fontSize="small" />
      </IconButton>
    );
    return [
      {
        field: 'role_title',
        headerName: 'Role',
        filter: { type: 'text' },
        flex: 1,
        minWidth: 160,
      },
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
      { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 140,
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'created_at',
        headerName: 'Received',
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
      <Typography variant="h5" fontWeight={700}>
        Job Applications
      </Typography>
      <DuncitTable<JobApplication>
        tableId="website-job-applications"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getApplicationRowId}
        onRowClick={setOpen}
        emptyText="No applications."
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
