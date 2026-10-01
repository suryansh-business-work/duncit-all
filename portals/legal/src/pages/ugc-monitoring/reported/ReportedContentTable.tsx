import { useMemo, type RefObject } from 'react';
import { Avatar, Chip, Stack, Typography } from '@mui/material';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import {
  DuncitTable,
  dateColumn,
  entityIdColumn,
  type DuncitColumn,
  type DuncitColumnOption,
  type TableFetch,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  REPORT_STATUSES,
  REPORT_STATUS_COLOR,
  REPORT_STATUS_KEY,
  REPORT_TARGET_KEY,
} from '@duncit/utils';
import type { ContentReport } from '../../../graphql/reports';
import ReportRowActions, { type ReportActionHandlers } from './ReportRowActions';
import { contentStateKey } from './contentState';

interface Props {
  fetchRows: TableFetch<ContentReport>;
  refetchRef: RefObject<(() => void) | null>;
  /** Admin-configured date + time, so every screen reads the same clock. */
  formatDateTime: (value: Date) => string;
  /** Every report category, for the Reason filter. */
  reasonOptions: DuncitColumnOption[];
  handlers: ReportActionHandlers;
}

const getRowId = (r: ContentReport) => r.id;

/**
 * The Legal queue of every post and story users have reported.
 *
 * Newest first, and the handle leads — a reviewer chasing a report quotes
 * RPT-000123. The thumbnail is the snapshot taken at report time, not a live
 * link: the story it names is usually gone within a day. The Content column
 * says whether the thing itself is still up, which is the first question
 * before deciding anything about it.
 */
export default function ReportedContentTable({
  fetchRows,
  refetchRef,
  formatDateTime,
  reasonOptions,
  handlers,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<ContentReport>[]>(() => {
    const renderTarget = (r: ContentReport) => (
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
        <Avatar variant="rounded" alt="" src={r.target_preview_url || undefined} sx={{ width: 34, height: 34 }}>
          <ImageNotSupportedOutlinedIcon fontSize="small" />
        </Avatar>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
            {t(REPORT_TARGET_KEY[r.target_type])}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
            {r.target_caption}
          </Typography>
        </Stack>
      </Stack>
    );

    const renderStatus = (r: ContentReport) => (
      <Chip
        size="small"
        variant={r.status === 'RECEIVED' ? 'outlined' : 'filled'}
        color={REPORT_STATUS_COLOR[r.status]}
        label={t(REPORT_STATUS_KEY[r.status])}
      />
    );

    const renderContent = (r: ContentReport) => (
      <Chip
        size="small"
        variant={r.target_live ? 'filled' : 'outlined'}
        color={r.target_live ? 'warning' : 'default'}
        label={t(contentStateKey(r))}
      />
    );

    const renderActions = (r: ContentReport) => (
      <ReportRowActions report={r} handlers={handlers} withOpen />
    );

    // Sort and filter keys are allowlisted on the server (REPORT_TABLE_CONFIG).
    return [
      entityIdColumn<ContentReport>({ field: 'report_no', headerName: t('reportLogs.colReportId') }),
      {
        field: 'target_type',
        headerName: t('reportLogs.colTarget'),
        flex: 1,
        minWidth: 220,
        type: 'enum',
        options: (Object.keys(REPORT_TARGET_KEY) as (keyof typeof REPORT_TARGET_KEY)[]).map(
          (value) => ({ value, label: t(REPORT_TARGET_KEY[value]) }),
        ),
        cellRenderer: renderTarget,
        valueGetter: (r) => t(REPORT_TARGET_KEY[r.target_type]),
      },
      {
        field: 'reason',
        headerName: t('reportLogs.colReason'),
        minWidth: 200,
        type: 'enum',
        options: reasonOptions,
        valueGetter: (r) => r.reason_label,
      },
      {
        field: 'reporter_name',
        headerName: t('reportLogs.colReporter'),
        minWidth: 150,
        type: 'text',
        // Resolved from the stored user id per row — no name to order or match on.
        sortable: false,
        filterable: false,
      },
      {
        field: 'target_owner_name',
        headerName: t('reportLogs.colOwner'),
        minWidth: 150,
        type: 'text',
        // Resolved from the stored user id per row — no name to order or match on.
        sortable: false,
        filterable: false,
      },
      {
        field: 'report_count',
        headerName: t('reportLogs.colReports'),
        width: 100,
        type: 'number',
        // Counted across the reports on the same content, not stored on the row.
        sortable: false,
        filterable: false,
      },
      {
        field: 'target_live',
        headerName: t('reportLogs.colContent'),
        width: 150,
        type: 'text',
        // Looked up against the post itself at read time, not a stored column.
        sortable: false,
        filterable: false,
        cellRenderer: renderContent,
        valueGetter: (r) => t(contentStateKey(r)),
      },
      {
        field: 'status',
        headerName: t('reportLogs.colStatus'),
        width: 130,
        type: 'enum',
        options: REPORT_STATUSES.map((value) => ({ value, label: t(REPORT_STATUS_KEY[value]) })),
        cellRenderer: renderStatus,
        valueGetter: (r) => t(REPORT_STATUS_KEY[r.status]),
      },
      dateColumn<ContentReport>({
        field: 'created_at',
        headerName: t('reportLogs.colReceived'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      {
        field: 'actions',
        headerName: t('reportLogs.colActions'),
        type: 'actions',
        width: 210,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDateTime, handlers, reasonOptions, t]);

  return (
    <DuncitTable<ContentReport>
      tableId="legal-ugc-reports"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={handlers.onOpen}
      emptyText={t('reportLogs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('reportLogs.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
