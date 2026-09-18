import { useMemo } from 'react';
import { DuncitTable, clientTableFetch, type DuncitColumn } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import { ANALYTICS_PAGES } from '../entity-analytics/pages';
import { PERIOD_OPTIONS } from '../entity-analytics/queries';
import {
  makeRenderActions,
  makeRenderLastSent,
  makeRenderName,
  makeRenderState,
  type RowActions,
} from './subscriber-cells';
import type { AnalyticsMailSubscription } from './queries';

interface Props extends RowActions {
  rows: AnalyticsMailSubscription[];
}

const getRowId = (row: AnalyticsMailSubscription) => row.id;
const searchOf = (row: AnalyticsMailSubscription) => `${row.name} ${row.email}`;
const PERIOD_LABELS = new Map<number, string>(PERIOD_OPTIONS.map((option) => [option.days, option.label]));

/** Everyone who receives the report, with what they get, when it last went and when it goes next. */
export default function SubscribersTable({ rows, onSend, onEdit, onDelete, sendingId }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<AnalyticsMailSubscription>[]>(() => {
    const frequencyLabels: Record<string, string> = {
      DAILY: t('analytics.mails.daily'),
      WEEKLY: t('analytics.mails.weekly'),
    };
    const statusLabels: Record<string, string> = {
      SENT: t('analytics.mails.statusSent'),
      FAILED: t('analytics.mails.statusFailed'),
      SKIPPED: t('analytics.mails.statusSkipped'),
    };
    const actionLabels = {
      send: t('analytics.mails.sendNow'),
      edit: t('analytics.mails.edit'),
      remove: t('analytics.mails.remove'),
    };
    const periodOf = (days: number) => {
      const label = PERIOD_LABELS.get(days);
      return label ? t(label) : String(days);
    };
    return [
      {
        field: 'name',
        headerName: t('analytics.mails.subscriber'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        cellRenderer: makeRenderName(),
        valueGetter: (row) => row.name,
      },
      {
        field: 'pages',
        headerName: t('analytics.mails.dashboards'),
        width: 150,
        type: 'text',
        valueGetter: (row) =>
          t('analytics.mails.dashboardsCount', { vars: { count: row.pages.length, total: ANALYTICS_PAGES.length } }),
      },
      {
        field: 'frequency',
        headerName: t('analytics.mails.frequency'),
        width: 120,
        type: 'text',
        valueGetter: (row) => frequencyLabels[row.frequency] ?? row.frequency,
      },
      {
        field: 'days',
        headerName: t('analytics.mails.period'),
        width: 120,
        type: 'text',
        valueGetter: (row) => periodOf(row.days),
      },
      {
        field: 'is_active',
        headerName: t('analytics.mails.state'),
        width: 120,
        type: 'text',
        cellRenderer: makeRenderState({ active: t('analytics.mails.active'), paused: t('analytics.mails.paused') }),
        valueGetter: (row) => (row.is_active ? t('analytics.mails.active') : t('analytics.mails.paused')),
      },
      {
        field: 'last_sent_at',
        headerName: t('analytics.mails.lastSent'),
        width: 230,
        type: 'text',
        cellRenderer: makeRenderLastSent(statusLabels, formatDateTime, t('analytics.mails.never')),
        valueGetter: (row) => row.last_sent_at ?? '',
      },
      {
        field: 'next_send_at',
        headerName: t('analytics.mails.nextSend'),
        width: 180,
        type: 'text',
        valueGetter: (row) => (row.next_send_at ? formatDateTime(row.next_send_at) : t('analytics.mails.notScheduled')),
      },
      {
        field: 'actions',
        headerName: t('analytics.mails.actions'),
        width: 140,
        type: 'actions',
        sortable: false,
        filterable: false,
        cellRenderer: makeRenderActions(actionLabels, { onSend, onEdit, onDelete, sendingId }),
      },
    ];
  }, [t, onSend, onEdit, onDelete, sendingId]);

  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf, columns), [rows, columns]);

  return (
    <DuncitTable<AnalyticsMailSubscription>
      tableId="analytics-mail-subscribers"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('analytics.mails.noSubscribers')}
      defaultSort={{ field: 'name', dir: 'asc' }}
      searchPlaceholder={t('analytics.mails.searchSubscribers')}
    />
  );
}
