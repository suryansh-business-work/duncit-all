import { useMemo, type MutableRefObject } from 'react';
import { Chip, Link, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ENV_COLOR, envOptions } from '../../components/telemetry-identity';
import {
  IMPACT_COLOR,
  STATUS_COLOR,
  impactLabel,
  impactOptions,
  reportWebsite,
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
  <Typography variant="body2" sx={{
    color: "text.secondary"
  }}>
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

/** The host alone: a column of full URLs is a column of "https://" repeated. */
const websiteHost = (url: string) => {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
};

/**
 * The address the report is about, as a link.
 *
 * A report almost always ends with somebody opening the thing that broke, and
 * "which website" is the question the row is read for. The click is stopped
 * from bubbling so opening the site does not also open the triage dialog.
 */
const renderWebsite = (t: Translate) => (row: StatusReportRow) => {
  const url = reportWebsite(row);
  if (!url) {
    return (
      <Typography variant="body2" sx={{
        color: "text.disabled"
      }}>
        {t('tech.statusReports.unknownWebsite')}
      </Typography>
    );
  }
  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      variant="body2"
      noWrap
      title={url}
      onClick={(event) => event.stopPropagation()}
    >
      {websiteHost(url)}
    </Link>
  );
};

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
        field: 'service_url',
        headerName: t('tech.statusReports.website'),
        width: 190,
        sortable: false,
        cellRenderer: renderWebsite(t),
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
