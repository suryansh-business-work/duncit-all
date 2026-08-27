import { useMemo, useRef } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { DuncitTable, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { StatusChip } from '@duncit/ui';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import FaqPageIntro from '../FaqPageIntro';
import {
  FAQ_SUBMISSION_STATUSES,
  FAQ_SUBMISSION_STATUS_COLOR,
  FAQ_SUBMISSIONS_TABLE,
  UPDATE_FAQ_SUBMISSION_STATUS,
  type FaqSubmissionRow,
  type FaqSubmissionStatus,
} from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: FaqSubmissionRow) => row.id;

/** Status names come from one map, so the chip and the filter cannot disagree. */
const statusLabels = (t: Translate): Record<FaqSubmissionStatus, string> => ({
  NEW: t('support.faqSubmissions.statusNew'),
  CONVERTED: t('support.faqSubmissions.statusConverted'),
  IGNORED: t('support.faqSubmissions.statusIgnored'),
});

/** Built out here so the column holds a plain reference rather than a
 *  component redefined on every render (S6478). */
const renderStatus =
  (labels: Record<FaqSubmissionStatus, string>) => (row: FaqSubmissionRow) => (
    <StatusChip
      status={row.status}
      label={labels[row.status]}
      colorMap={FAQ_SUBMISSION_STATUS_COLOR}
    />
  );

const renderActions =
  (t: Translate, setStatus: (row: FaqSubmissionRow, status: FaqSubmissionStatus) => void) =>
  (row: FaqSubmissionRow) => (
    <Stack direction="row" spacing={1} component="span" sx={{ justifyContent: 'flex-end' }}>
      <DuncitButton
        size="small"
        variant="outlined"
        disabled={row.status === 'CONVERTED'}
        onClick={() => setStatus(row, 'CONVERTED')}
      >
        {t('support.faqSubmissions.markConverted')}
      </DuncitButton>
      <DuncitButton
        size="small"
        color="warning"
        disabled={row.status === 'IGNORED'}
        onClick={() => setStatus(row, 'IGNORED')}
      >
        {t('support.faqSubmissions.ignore')}
      </DuncitButton>
    </Stack>
  );

const dash = (value: string | null) => value || '—';

export default function FaqSubmissionsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_FAQ_SUBMISSION_STATUS, {
    onCompleted: () => refetchRef.current?.(),
  });
  const { formatDateTime } = useDateFormat();

  const fetchRows = useApolloTableFetch<FaqSubmissionRow>(
    client,
    FAQ_SUBMISSIONS_TABLE,
    'faqSubmissionsTable',
  );

  const columns = useMemo<DuncitColumn<FaqSubmissionRow>[]>(() => {
    const labels = statusLabels(t);
    const setStatus = (row: FaqSubmissionRow, status: FaqSubmissionStatus) => {
      updateStatus({ variables: { id: row.id, status } }).catch(() => undefined);
    };
    return [
      {
        field: 'question',
        headerName: t('support.faqSubmissions.question'),
        flex: 2,
        minWidth: 260,
      },
      {
        field: 'email',
        headerName: t('shell.common.email'),
        flex: 1,
        minWidth: 180,
        valueGetter: (row) => dash(row.email),
      },
      {
        field: 'super_category_slug',
        headerName: t('support.faqSubmissions.superCategory'),
        filter: { type: 'text' },
        minWidth: 130,
        valueGetter: (row) => dash(row.super_category_slug),
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        filter: {
          type: 'select',
          options: FAQ_SUBMISSION_STATUSES.map((status) => ({
            value: status,
            label: labels[status],
          })),
        },
        width: 130,
        cellRenderer: renderStatus(labels),
        valueGetter: (row) => row.status,
      },
      {
        field: 'created_at',
        headerName: t('support.faqSubmissions.received'),
        filter: { type: 'date' },
        minWidth: 180,
        valueGetter: (row) => formatDateTime(row.created_at),
      },
      {
        field: 'actions',
        headerName: t('shell.common.actions'),
        sortable: false,
        width: 250,
        cellRenderer: renderActions(t, setStatus),
      },
    ];
  }, [formatDateTime, t, updateStatus]);

  return (
    <Stack spacing={2}>
      <FaqPageIntro
        title={t('support.faqSubmissions.title')}
        description={t('support.faqSubmissions.subtitle')}
        hint={t('support.faqSubmissions.hint')}
      />
      <DuncitTable<FaqSubmissionRow>
        tableId="support-faq-submissions"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        emptyText={t('support.faqSubmissions.empty')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        searchPlaceholder={t('support.faqSubmissions.searchPlaceholder')}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
