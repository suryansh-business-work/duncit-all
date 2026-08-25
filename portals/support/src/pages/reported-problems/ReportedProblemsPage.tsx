import { useMemo, useRef } from 'react';
import { useApolloClient } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Chip, Stack, Typography } from '@mui/material';
import { PageHeader, StatusChip } from '@duncit/ui';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat, type DateFormatter } from '@duncit/app-settings';
import { REPORTED_PROBLEMS_TABLE, type FeedbackReportRow } from '../../graphql/reported-problems';
import { useTranslation } from '@duncit/shell';

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

type CellProps = Readonly<{ row: FeedbackReportRow }>;

function CategoryCell({ row }: CellProps) {
  return <Chip size="small" label={row.category} variant="outlined" />;
}

function MessageCell({ row }: CellProps) {
  return (
    <Typography variant="body2" noWrap title={row.message}>
      {row.message}
    </Typography>
  );
}

function ReporterCell({ row }: CellProps) {
  return (
    <Stack sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap>
        {row.user_name || 'Unknown'}
      </Typography>
      <Typography variant="caption" noWrap sx={{
        color: "text.secondary"
      }}>
        {row.user_email}
      </Typography>
    </Stack>
  );
}

function StatusCell({ row }: CellProps) {
  return <StatusChip status={row.status} colorMap={STATUS_COLORS} />;
}

// A report that never reached Slack is not a broken report — it is one
// nobody was told about, which is a different thing to chase.
function SlackCell({ row }: CellProps) {
  const { t } = useTranslation();
  if (row.slack_error) {
    return <Chip size="small" color="warning" variant="outlined" label={t('support.problems.slackNotSent')} title={row.slack_error} />;
  }
  return <Chip size="small" color="success" variant="outlined" label={t('support.problems.slackSent')} />;
}

type Translate = ReturnType<typeof useTranslation>['t'];

function buildColumns(formatDateTime: DateFormatter['formatDateTime'], t: Translate): DuncitColumn<FeedbackReportRow>[] {
  return [
    { field: 'report_no', headerName: t('support.problems.colId'), filter: { type: 'text' }, width: 160 },
    {
      field: 'category',
      headerName: t('support.problems.colCategory'),
      filter: { type: 'text' },
      width: 130,
      cellRenderer: (r) => <CategoryCell row={r} />,
    },
    {
      field: 'message',
      headerName: t('support.problems.colWhatHappened'),
      sortable: false,
      flex: 1,
      minWidth: 260,
      cellRenderer: (r) => <MessageCell row={r} />,
    },
    {
      field: 'user_name',
      headerName: t('support.problems.colReportedBy'),
      filter: { type: 'text' },
      minWidth: 190,
      cellRenderer: (r) => <ReporterCell row={r} />,
    },
    { field: 'platform', headerName: t('support.problems.colFrom'), filter: { type: 'text' }, width: 110 },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      filter: { type: 'select', options: STATUS_OPTIONS },
      width: 140,
      cellRenderer: (r) => <StatusCell row={r} />,
    },
    {
      field: 'slack_error',
      headerName: t('support.problems.colSlack'),
      sortable: false,
      width: 120,
      cellRenderer: (r) => <SlackCell row={r} />,
    },
    {
      field: 'created_at',
      headerName: t('support.problems.colReported'),
      filter: { type: 'date' },
      width: 180,
      valueGetter: (r) => (r.created_at ? formatDateTime(r.created_at) : ''),
    },
  ];
}

/**
 * Every problem reported from the app through "Report a Problem".
 *
 * These rows exist because the report is now SAVED before Slack is told about
 * it. It used to be a Slack-only side effect, so a missing channel threw the
 * reporter's message away and there was nothing for Support to read.
 */
export default function ReportedProblemsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const { formatDateTime } = useDateFormat();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<FeedbackReportRow>(
    client,
    REPORTED_PROBLEMS_TABLE,
    'reportedProblemsTable'
  );

  const columns = useMemo(() => buildColumns(formatDateTime, t), [formatDateTime, t]);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('support.problems.title')} subtitle={t('support.problems.subtitle')} />
      <DuncitTable<FeedbackReportRow>
        tableId="support-reported-problems"
        columns={columns}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        getRowId={(r) => r.id}
        onRowClick={(r) => navigate(`/reported-problems/${r.id}`)}
        emptyText={t('support.problems.empty')}
      />
    </Stack>
  );
}
