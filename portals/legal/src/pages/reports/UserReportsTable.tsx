import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import {
  DuncitTable,
  dateColumn,
  entityIdColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import {
  REPORT_REASON_KEY,
  REPORT_STATUSES,
  REPORT_STATUS_COLOR,
  REPORT_STATUS_KEY,
  REPORT_TARGET_KEY,
} from '@duncit/utils';
import type { ContentReport } from '../../graphql/reports';

interface Props {
  fetchRows: TableFetch<ContentReport>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Admin-configured date + time, so every screen reads the same clock. */
  formatDateTime: (value: Date) => string;
  onOpen: (report: ContentReport) => void;
}

const getRowId = (r: ContentReport) => r.id;

/**
 * The Legal queue of everything users have reported.
 *
 * Newest first, and the handle leads — a reviewer chasing a report quotes
 * RPT-000123. The thumbnail is the snapshot taken at report time, not a live
 * link: the story it names is usually gone within a day.
 */
export default function UserReportsTable({
  fetchRows,
  refetchRef,
  formatDateTime,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<ContentReport>[]>(() => {
    const renderTarget = (r: ContentReport) => (
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          minWidth: 0
        }}>
        <Avatar variant="rounded" src={r.target_preview_url || undefined} sx={{ width: 34, height: 34 }}>
          <ImageNotSupportedOutlinedIcon fontSize="small" />
        </Avatar>
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap sx={{
            fontWeight: 700
          }}>
            {t(REPORT_TARGET_KEY[r.target_type])}
          </Typography>
          <Typography variant="caption" noWrap sx={{
            color: "text.secondary"
          }}>
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

    const renderActions = (r: ContentReport) => (
      <Tooltip title={t('reportLogs.open')}>
        <IconButton size="small" aria-label={t('reportLogs.open')} onClick={() => onOpen(r)}>
          <VisibilityIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    );

    // Only server-allowlisted fields are sortable/filterable (REPORT_TABLE_CONFIG):
    // report_no / target_type / reason / status / created_at / updated_at.
    return [
      entityIdColumn<ContentReport>({ field: 'report_no', headerName: t('reportLogs.colReportId') }),
      {
        field: 'target_type',
        headerName: t('reportLogs.colTarget'),
        flex: 1,
        minWidth: 240,
        filter: {
          type: 'select',
          options: (Object.keys(REPORT_TARGET_KEY) as (keyof typeof REPORT_TARGET_KEY)[]).map(
            (value) => ({ value, label: t(REPORT_TARGET_KEY[value]) }),
          ),
        },
        cellRenderer: renderTarget,
        valueGetter: (r) => t(REPORT_TARGET_KEY[r.target_type]),
      },
      {
        field: 'reason',
        headerName: t('reportLogs.colReason'),
        minWidth: 200,
        filter: {
          type: 'select',
          options: (Object.keys(REPORT_REASON_KEY) as (keyof typeof REPORT_REASON_KEY)[]).map(
            (value) => ({ value, label: t(REPORT_REASON_KEY[value]) }),
          ),
        },
        valueGetter: (r) => t(REPORT_REASON_KEY[r.reason]),
      },
      {
        field: 'reporter_name',
        headerName: t('reportLogs.colReporter'),
        minWidth: 160,
        sortable: false,
      },
      {
        field: 'target_owner_name',
        headerName: t('reportLogs.colOwner'),
        minWidth: 160,
        sortable: false,
      },
      {
        field: 'status',
        headerName: t('reportLogs.colStatus'),
        width: 130,
        filter: {
          type: 'select',
          options: REPORT_STATUSES.map((value) => ({ value, label: t(REPORT_STATUS_KEY[value]) })),
        },
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
        sortable: false,
        width: 90,
        cellRenderer: renderActions,
      },
    ];
  }, [formatDateTime, onOpen, t]);

  return (
    <DuncitTable<ContentReport>
      tableId="legal-user-reports"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('reportLogs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('reportLogs.searchPlaceholder')}
      refetchRef={refetchRef}
    />
  );
}
