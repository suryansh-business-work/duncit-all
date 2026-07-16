import { useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button, Stack, Typography } from '@mui/material';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import {
  FAQ_STATUS_COLOR,
  FAQ_STATUSES,
  FAQ_SUBMISSIONS_TABLE,
  UPDATE_FAQ_SUBMISSION_STATUS,
  type FaqSubmission,
  type FaqSubmissionStatus,
} from './queries';

const getFaqRowId = (row: FaqSubmission) => row.id;

const STATUS_OPTIONS = FAQ_STATUSES.map((status) => ({ value: status, label: status }));

const renderStatus = (row: FaqSubmission) => (
  <StatusChip status={row.status} colorMap={FAQ_STATUS_COLOR} />
);

export default function FaqSubmissionsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_FAQ_SUBMISSION_STATUS, {
    onCompleted: () => refetchRef.current?.(),
  });
  const { formatDateTime } = useDateFormat();

  const fetchRows = useApolloTableFetch<FaqSubmission>(client, FAQ_SUBMISSIONS_TABLE, 'faqSubmissionsTable');

  const columns = useMemo<DuncitColumn<FaqSubmission>[]>(() => {
    const setStatus = (row: FaqSubmission, status: FaqSubmissionStatus) => {
      updateStatus({ variables: { id: row.id, status } }).catch(() => undefined);
    };
    const renderActions = (row: FaqSubmission) => (
      <Stack direction="row" spacing={1} justifyContent="flex-end" component="span">
        <Button
          size="small"
          variant="outlined"
          disabled={row.status === 'CONVERTED'}
          onClick={() => setStatus(row, 'CONVERTED')}
        >
          Mark Converted
        </Button>
        <Button
          size="small"
          color="warning"
          disabled={row.status === 'IGNORED'}
          onClick={() => setStatus(row, 'IGNORED')}
        >
          Ignore
        </Button>
      </Stack>
    );
    return [
      { field: 'question', headerName: 'Question', flex: 2, minWidth: 260 },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1,
        minWidth: 180,
        valueGetter: (row) => row.email || '—',
      },
      {
        field: 'super_category_slug',
        headerName: 'Super Cat.',
        filter: { type: 'text' },
        minWidth: 130,
        valueGetter: (row) => row.super_category_slug || '—',
      },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 130,
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
        headerName: 'Actions',
        sortable: false,
        width: 250,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDateTime, updateStatus]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight={700}>
        FAQ Submission
      </Typography>
      <DuncitTable<FaqSubmission>
        tableId="website-faq-submissions"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getFaqRowId}
        emptyText="No submissions."
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder="Search question, email or category"
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
