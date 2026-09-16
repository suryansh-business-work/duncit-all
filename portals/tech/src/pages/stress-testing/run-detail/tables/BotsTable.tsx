import { useMemo } from 'react';
import { Chip } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { DuncitColumn } from '@duncit/table';
import { formatTime } from '@duncit/app-settings';
import LiveRowsTable from '../../components/LiveRowsTable';
import SectionCard from '../../components/SectionCard';
import type { StressBot, StressShard } from '../../queries';
import { formatMs, journeyLabel } from '../../labels';

const getRowId = (row: StressBot) => row.bot;
const searchOf = (row: StressBot) => `${row.bot} ${row.journey} ${row.page} ${row.status}`;

function statusColor(status: string): 'success' | 'error' | 'warning' | 'default' {
  if (status === 'error' || status === 'TIMEOUT' || status === 'NETWORK' || status === 'GQL_ERROR' || status.startsWith('5')) {
    return 'error';
  }
  if (status === 'loaded-js-errors' || status.startsWith('4')) return 'warning';
  if (status === 'loaded' || status.startsWith('2')) return 'success';
  return 'default';
}

const renderStatus = (row: StressBot) => <Chip size="small" variant="outlined" color={statusColor(row.status)} label={row.status || '—'} />;

interface Props {
  shards: readonly StressShard[];
}

/**
 * Every bot, and the page it is on this second. Browser tabs first — there are
 * few of them and they are the realistic ones — then a sample of the HTTP users.
 */
export default function BotsTable({ shards }: Readonly<Props>) {
  const { t } = useTranslation();
  const rows = useMemo(() => shards.flatMap((shard) => shard.bots), [shards]);
  // The journeys these bots are on, as one stable key — so a poll that brings
  // the same set does not rebuild the columns.
  const journeyKey = useMemo(
    () => [...new Set(rows.map((row) => row.journey))].sort((a, b) => a.localeCompare(b)).join('|'),
    [rows]
  );
  const columns = useMemo<DuncitColumn<StressBot>[]>(
    () => [
      { field: 'bot', headerName: t('tech.stress.colBot'), width: 150, type: 'text', valueGetter: (row) => row.bot },
      {
        field: 'kind',
        headerName: t('tech.stress.colKind'),
        width: 110,
        type: 'enum',
        options: [
          { value: 'BROWSER', label: t('tech.stress.kindBrowser') },
          { value: 'HTTP', label: t('tech.stress.kindHttp') },
        ],
        valueGetter: (row) => (row.kind === 'BROWSER' ? t('tech.stress.kindBrowser') : t('tech.stress.kindHttp')),
      },
      {
        field: 'journey',
        headerName: t('tech.stress.colJourney'),
        width: 140,
        type: 'enum',
        options: journeyKey ? journeyKey.split('|').map((journey) => ({ value: journey, label: journeyLabel(t, journey) })) : [],
        valueGetter: (row) => journeyLabel(t, row.journey),
      },
      { field: 'page', headerName: t('tech.stress.colPage'), flex: 1, minWidth: 200, type: 'text', valueGetter: (row) => row.page },
      { field: 'status', headerName: t('tech.stress.colStatus'), width: 150, type: 'text', cellRenderer: renderStatus, valueGetter: (row) => row.status },
      { field: 'load_ms', headerName: t('tech.stress.colLoadTime'), width: 110, type: 'number', valueGetter: (row) => formatMs(row.load_ms) },
      { field: 'at', headerName: t('tech.stress.colSeen'), width: 110, type: 'date', valueGetter: (row) => (row.at ? formatTime(row.at) : '—') },
    ],
    [journeyKey, t]
  );

  return (
    <SectionCard title={t('tech.stress.botsTitle')} subtitle={t('tech.stress.botsSubtitle', { vars: { count: rows.length } })}>
      <LiveRowsTable
        tableId="tech-stress-bots"
        columns={columns}
        rows={rows}
        getRowId={getRowId}
        searchOf={searchOf}
        emptyText={t('tech.stress.botsEmpty')}
        searchPlaceholder={t('tech.stress.botsSearch')}
      />
    </SectionCard>
  );
}
