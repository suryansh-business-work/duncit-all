import { useMemo } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { StatusColorMap } from '@duncit/ui';
import { ANALYTICS_PAGES } from '../entity-analytics/pages';
import { KPI_COPY } from '../entity-analytics/copy';
import { formatValue } from '../entity-analytics/format';
import { PERIOD_OPTIONS } from '../entity-analytics/queries';
import { makeRenderActive, makeRenderLastRun, makeRenderRowButtons, makeRenderTwoLine } from '../settings-cells';
import { CHANGE_CONDITIONS, CONDITION_LABELS } from './analytics-alert';
import { alertErrorKey } from './alert-errors';
import type { AnalyticsAlert } from './queries';

interface Props {
  rows: AnalyticsAlert[];
  onCheck: (row: AnalyticsAlert) => void;
  onEdit: (row: AnalyticsAlert) => void;
  onDelete: (row: AnalyticsAlert) => void;
  /** The row being checked right now, so its button can wait. */
  checkingId: string | null;
}

const getRowId = (row: AnalyticsAlert) => row.id;
const PAGE_TITLES = new Map<string, string>(ANALYTICS_PAGES.map((page) => [page.entity, page.title]));
const PERIOD_LABELS = new Map<number, string>(PERIOD_OPTIONS.map((option) => [option.days, option.label]));
const STATUS_COLORS: StatusColorMap = { OK: 'success', TRIGGERED: 'error', ERROR: 'warning' };

/** The threshold in the unit the rule reads: a change is a percentage, a value is a plain number. */
const thresholdText = (row: AnalyticsAlert) =>
  formatValue(row.threshold, CHANGE_CONDITIONS.has(row.condition) ? 'PERCENT' : 'DECIMAL');

/** Every alert: what it watches, when it trips, who hears, and how its last check went. */
export default function AlertsTable({ rows, onCheck, onEdit, onDelete, checkingId }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<AnalyticsAlert>[]>(() => {
    const tileOf = (row: AnalyticsAlert) => {
      const copy = KPI_COPY[row.kpi_key];
      const page = PAGE_TITLES.get(row.entity);
      return t('analytics.alerts.tileCaption', {
        vars: { tile: copy ? t(copy.title) : row.kpi_key, dashboard: page ? t(page) : row.entity },
      });
    };
    const ruleOf = (row: AnalyticsAlert) =>
      t('analytics.alerts.ruleText', { vars: { condition: t(CONDITION_LABELS[row.condition]), threshold: thresholdText(row) } });
    const recipientsOf = (row: AnalyticsAlert) => {
      const people = t('analytics.alerts.peopleCount', { vars: { count: row.emails.length } });
      return row.slack ? t('analytics.alerts.withSlack', { vars: { people } }) : people;
    };
    const periodOf = (days: number) => {
      const label = PERIOD_LABELS.get(days);
      return label ? t(label) : String(days);
    };
    const statusLabels: Record<string, string> = {
      OK: t('analytics.alerts.statusOk'),
      TRIGGERED: t('analytics.alerts.statusTriggered'),
      ERROR: t('analytics.alerts.statusError'),
    };
    const lastRunOf = (row: AnalyticsAlert) => ({
      status: row.last_status,
      at: row.last_checked_at,
      detail: row.last_status === 'ERROR' ? t(alertErrorKey(row.last_error)) : null,
    });
    return [
      {
        field: 'name',
        headerName: t('analytics.alerts.alert'),
        flex: 1,
        minWidth: 240,
        type: 'text',
        cellRenderer: makeRenderTwoLine<AnalyticsAlert>((row) => row.name, tileOf),
        valueGetter: (row) => row.name,
      },
      { field: 'condition', headerName: t('analytics.alerts.rule'), minWidth: 200, type: 'text', valueGetter: ruleOf },
      {
        field: 'days',
        headerName: t('analytics.alerts.period'),
        width: 120,
        type: 'text',
        valueGetter: (row) => periodOf(row.days),
      },
      { field: 'emails', headerName: t('analytics.alerts.recipients'), width: 170, type: 'text', valueGetter: recipientsOf },
      {
        field: 'is_active',
        headerName: t('analytics.alerts.state'),
        width: 120,
        type: 'text',
        cellRenderer: makeRenderActive<AnalyticsAlert>({
          active: t('analytics.alerts.active'),
          paused: t('analytics.alerts.paused'),
        }),
        valueGetter: (row) => (row.is_active ? t('analytics.alerts.active') : t('analytics.alerts.paused')),
      },
      {
        field: 'last_checked_at',
        headerName: t('analytics.alerts.lastCheck'),
        width: 230,
        type: 'text',
        cellRenderer: makeRenderLastRun(lastRunOf, {
          status: statusLabels,
          colors: STATUS_COLORS,
          never: t('analytics.alerts.never'),
          formatWhen: formatDateTime,
        }),
        valueGetter: (row) => row.last_checked_at ?? '',
      },
      {
        field: 'actions',
        headerName: t('analytics.alerts.actions'),
        width: 140,
        type: 'actions',
        sortable: false,
        filterable: false,
        cellRenderer: makeRenderRowButtons<AnalyticsAlert>(
          { run: t('analytics.alerts.checkNow'), edit: t('analytics.alerts.edit'), remove: t('analytics.alerts.remove') },
          <PlayArrowIcon fontSize="small" />,
          'analytics-alert-check',
          { onRun: onCheck, onEdit, onDelete, runningId: checkingId }
        ),
      },
    ];
  }, [t, onCheck, onEdit, onDelete, checkingId]);

  const fetchRows = useMemo(() => clientTableFetch(rows, (row) => row.name, columns), [rows, columns]);

  return (
    <DuncitTable<AnalyticsAlert>
      tableId="analytics-alerts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('analytics.alerts.noAlerts')}
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder={t('analytics.alerts.searchAlerts')}
    />
  );
}
