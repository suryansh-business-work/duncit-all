import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Chip, Stack, Typography } from '@mui/material';
import { PageHeader, StatusChip } from '@duncit/ui';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { REPORTED_PROBLEMS_TABLE, type FeedbackReportRow } from '../../graphql/reported-problems';

const STATUS_COLORS = {
  OPEN: 'warning',
  IN_REVIEW: 'info',
  RESOLVED: 'success',
  CLOSED: 'default',
} as const;

const STATUS_OPTIONS = Object.keys(STATUS_COLORS).map((value) => ({
  value,
  label: value.replaceAll('_', ' '),
}));

/**
 * Every problem reported from the app through "Report a Problem".
 *
 * These rows exist because the report is now SAVED before Slack is told about
 * it. It used to be a Slack-only side effect, so a missing channel threw the
 * reporter's message away and there was nothing for Support to read.
 */
export default function ReportedProblemsPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<FeedbackReportRow>(
    client,
    REPORTED_PROBLEMS_TABLE,
    'reportedProblemsTable'
  );

  const columns = useMemo<DuncitColumn<FeedbackReportRow>[]>(
    () => [
      { field: 'report_no', headerName: 'Report ID', filter: { type: 'text' }, width: 160 },
      {
        field: 'category',
        headerName: 'Category',
        filter: { type: 'text' },
        width: 130,
        cellRenderer: (r) => <Chip size="small" label={r.category} variant="outlined" />,
      },
      {
        field: 'message',
        headerName: 'What happened',
        sortable: false,
        flex: 1,
        minWidth: 260,
        cellRenderer: (r) => (
          <Typography variant="body2" noWrap title={r.message}>
            {r.message}
          </Typography>
        ),
      },
      {
        field: 'user_name',
        headerName: 'Reported by',
        filter: { type: 'text' },
        minWidth: 190,
        cellRenderer: (r) => (
          <Stack sx={{ minWidth: 0, lineHeight: 1.2 }}>
            <Typography variant="body2" noWrap>
              {r.user_name || 'Unknown'}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {r.user_email}
            </Typography>
          </Stack>
        ),
      },
      { field: 'platform', headerName: 'From', filter: { type: 'text' }, width: 110 },
      {
        field: 'status',
        headerName: 'Status',
        filter: { type: 'select', options: STATUS_OPTIONS },
        width: 140,
        cellRenderer: (r) => <StatusChip status={r.status} colorMap={STATUS_COLORS} />,
      },
      {
        // A report that never reached Slack is not a broken report — it is one
        // nobody was told about, which is a different thing to chase.
        field: 'slack_error',
        headerName: 'Slack',
        sortable: false,
        width: 120,
        cellRenderer: (r) =>
          r.slack_error ? (
            <Chip size="small" color="warning" variant="outlined" label="Not sent" title={r.slack_error} />
          ) : (
            <Chip size="small" color="success" variant="outlined" label="Sent" />
          ),
      },
      {
        field: 'created_at',
        headerName: 'Reported',
        filter: { type: 'date' },
        width: 180,
        valueGetter: (r) => (r.created_at ? formatDateTime(r.created_at) : ''),
      },
    ],
    [formatDateTime]
  );

  return (
    <Stack spacing={2}>
      <PageHeader title="Reported Problems" subtitle="Problem reports filed from the app." />
      <DuncitTable<FeedbackReportRow>
        tableId="support-reported-problems"
        columns={columns}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/reported-problems/${r.id}`)}
        emptyText="No problems have been reported yet."
      />
    </Stack>
  );
}
