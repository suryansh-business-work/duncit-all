import { useMemo } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { RateLimitSystemRow } from '../queries';
import { enumLabel } from '../labels';

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: RateLimitSystemRow) => row.id;

/** What a search term is matched against — the label, the key and the surface. */
const searchOf = (row: RateLimitSystemRow) => `${row.label} ${row.app} ${row.surface}`;

const renderLabel = (row: RateLimitSystemRow) => (
  <Stack sx={{ gap: 0.25 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.label || row.app}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {row.app}
    </Typography>
  </Stack>
);

const renderBlocked = (row: RateLimitSystemRow) => (
  <Typography variant="body2" sx={{ color: row.blocked > 0 ? 'error.main' : 'text.secondary' }}>
    {row.blocked}
  </Typography>
);

/** No enabled rule can reach this system — worth saying, not just showing 0. */
const renderRuleCount = (row: RateLimitSystemRow, t: Translate) =>
  row.rule_count > 0 ? (
    <Chip size="small" label={row.rule_count} />
  ) : (
    <Chip size="small" color="warning" label={t('tech.rateLimit.systems.ungoverned')} />
  );

interface Props {
  rows: RateLimitSystemRow[];
}

/**
 * Every caller the server has ever heard from.
 *
 * Paged in the browser: this list is one row per system — a few dozen at the
 * very most — so a server round trip per sort would cost more than it saves.
 */
export default function SystemsTable({ rows }: Readonly<Props>) {
  const { t } = useTranslation();
  const fetchRows = useMemo(() => clientTableFetch(rows, searchOf), [rows]);

  const columns = useMemo<DuncitColumn<RateLimitSystemRow>[]>(
    () => [
      {
        field: 'label',
        headerName: t('tech.rateLimit.systems.system'),
        flex: 1.2,
        minWidth: 200,
        cellRenderer: renderLabel,
      },
      {
        field: 'surface',
        headerName: t('tech.rateLimit.field.surface'),
        width: 150,
        valueGetter: (row) => enumLabel(t, row.surface),
      },
      { field: 'requests', headerName: t('tech.rateLimit.systems.requests'), width: 130 },
      {
        field: 'blocked',
        headerName: t('tech.rateLimit.systems.blocked'),
        width: 120,
        cellRenderer: renderBlocked,
      },
      {
        field: 'rule_count',
        headerName: t('tech.rateLimit.systems.rules'),
        width: 130,
        cellRenderer: (row) => renderRuleCount(row, t),
      },
      dateColumn<RateLimitSystemRow>({
        field: 'last_seen_at',
        headerName: t('tech.rateLimit.systems.lastSeen'),
        hide: false,
        filterable: false,
        width: 190,
      }),
    ],
    [t],
  );

  return (
    <DuncitTable<RateLimitSystemRow>
      tableId="tech-rate-limit-systems"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.rateLimit.systems.empty')}
      searchPlaceholder={t('tech.rateLimit.systems.searchPlaceholder')}
      defaultSort={{ field: 'requests', dir: 'desc' }}
    />
  );
}
