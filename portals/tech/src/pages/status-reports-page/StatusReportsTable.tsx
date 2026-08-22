import { useMemo, type MutableRefObject } from 'react';
import { Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ENV_COLOR, envOptions } from '../../components/telemetry-identity';
import {
  IMPACT_COLOR,
  STATUS_COLOR,
  impactLabel,
  impactOptions,
  statusLabel,
  statusOptions,
  type StatusReportRow,
} from './queries';

const getRowId = (row: StatusReportRow) => row.id;

type Translate = ReturnType<typeof useTranslation>['t'];

// The cells live out here rather than inside the component so a re-render does
// not hand the table a brand-new component type for every column (S6478). The
// two that read copy take `t` through a factory, which keeps the column
// definition a plain reference instead of an inline arrow.
const renderWhen = (row: StatusReportRow) => (
  <Typography variant="body2" color="text.secondary">
    {formatDateTime(row.created_at)}
  </Typography>
);

const renderStatus = (t: Translate) => (row: StatusReportRow) => (
  <Chip size="small" color={STATUS_COLOR[row.status]} label={statusLabel(t, row.status)} />
);

const renderImpact = (t: Translate) => (row: StatusReportRow) => (
  <Chip
    size="small"
    variant="outlined"
    color={IMPACT_COLOR[row.impact]}
    label={impactLabel(t, row.impact)}
  />
);

const renderEnvironment = (row: StatusReportRow) => (
  <Chip size="small" label={row.environment} color={ENV_COLOR[row.environment] ?? 'default'} />
);

/** The reporter's name, with the address it came from as the tooltip. */
const renderReporter = (row: StatusReportRow) => (
  <Typography variant="body2" noWrap title={row.email}>
    {row.name}
  </Typography>
);

const renderMessage = (row: StatusReportRow) => (
  <Typography variant="body2" noWrap title={row.message}>
    {row.message}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<StatusReportRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (row: StatusReportRow) => void;
}

export default function StatusReportsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<StatusReportRow>[]>(
    () => [
      {
        field: 'created_at',
        headerName: t('tech.common.when'),
        width: 175,
        cellRenderer: renderWhen,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        filter: { type: 'select', options: statusOptions(t) },
        cellRenderer: renderStatus(t),
      },
      {
        field: 'impact',
        headerName: t('tech.statusReports.impact'),
        width: 190,
        filter: { type: 'select', options: impactOptions(t) },
        cellRenderer: renderImpact(t),
      },
      {
        field: 'service_name',
        headerName: t('tech.statusReports.service'),
        width: 150,
        valueGetter: (row) => row.service_name || t('tech.statusReports.unspecifiedService'),
      },
      {
        field: 'environment',
        headerName: t('tech.common.env'),
        width: 120,
        filter: { type: 'select', options: envOptions(t) },
        cellRenderer: renderEnvironment,
      },
      {
        field: 'name',
        headerName: t('tech.statusReports.reporter'),
        width: 170,
        cellRenderer: renderReporter,
      },
      {
        field: 'message',
        headerName: t('tech.common.message'),
        flex: 1,
        minWidth: 240,
        sortable: false,
        cellRenderer: renderMessage,
      },
    ],
    [t]
  );

  return (
    <DuncitTable<StatusReportRow>
      tableId="tech-status-reports"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.statusReports.noReportsYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.statusReports.searchHint')}
      refetchRef={refetchRef}
      onRowClick={onOpen}
    />
  );
}
