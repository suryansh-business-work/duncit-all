import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Stack, Switch, Typography } from '@mui/material';
import {
  DuncitTable,
  actionsColumn,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { RateLimitRuleRow } from '../queries';
import { allowance, enumLabel } from '../labels';

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: RateLimitRuleRow) => row.id;

const renderName = (row: RateLimitRuleRow) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.name}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
      {row.description}
    </Typography>
  </Stack>
);

/** ENFORCE is red because it refuses people; MONITOR only writes a row. */
const renderMode = (row: RateLimitRuleRow, t: Translate) => (
  <Chip
    size="small"
    color={row.mode === 'ENFORCE' ? 'error' : 'warning'}
    variant={row.mode === 'ENFORCE' ? 'filled' : 'outlined'}
    label={enumLabel(t, row.mode)}
  />
);

const renderScope = (row: RateLimitRuleRow, t: Translate) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2">{enumLabel(t, row.surface)}</Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {row.app === '*' ? enumLabel(t, 'ALL') : row.app} · {enumLabel(t, row.channel)}
    </Typography>
  </Stack>
);

const renderAllowance = (row: RateLimitRuleRow, t: Translate) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {allowance(row.limit, row.window_seconds)}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {enumLabel(t, row.key_by)} · {enumLabel(t, row.algorithm)}
    </Typography>
  </Stack>
);

const renderBlocked = (row: RateLimitRuleRow) => (
  <Typography
    variant="body2"
    sx={{ color: row.blocked_count > 0 ? 'error.main' : 'text.secondary' }}
  >
    {row.blocked_count}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<RateLimitRuleRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  onToggle: (row: RateLimitRuleRow) => void;
  onEdit: (row: RateLimitRuleRow) => void;
  onRemove: (row: RateLimitRuleRow) => void;
}

/** The rules, in the order the enforcer walks them. */
export default function RulesTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  onToggle,
  onEdit,
  onRemove,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<RateLimitRuleRow>[]>(() => {
    const renderEnabled = (row: RateLimitRuleRow) => (
      <Switch size="small" checked={row.enabled} onChange={() => onToggle(row)} />
    );
    return [
      {
        field: 'enabled',
        headerName: t('tech.rateLimit.field.enabled'),
        width: 100,
        filter: { type: 'boolean' },
        cellRenderer: renderEnabled,
        valueGetter: (row) => (row.enabled ? 1 : 0),
      },
      { field: 'priority', headerName: t('tech.rateLimit.field.priority'), width: 100 },
      {
        field: 'name',
        headerName: t('shell.common.name'),
        flex: 1.4,
        minWidth: 220,
        cellRenderer: renderName,
      },
      {
        field: 'surface',
        headerName: t('tech.rateLimit.rules.scope'),
        flex: 1,
        minWidth: 170,
        filter: { type: 'text' },
        cellRenderer: (row) => renderScope(row, t),
        valueGetter: (row) => `${row.surface} ${row.app} ${row.channel}`,
      },
      {
        field: 'limit',
        headerName: t('tech.rateLimit.rules.allowance'),
        width: 170,
        cellRenderer: (row) => renderAllowance(row, t),
      },
      {
        field: 'mode',
        headerName: t('tech.rateLimit.field.mode'),
        width: 120,
        filter: { type: 'text' },
        cellRenderer: (row) => renderMode(row, t),
        valueGetter: (row) => row.mode,
      },
      { field: 'hit_count', headerName: t('tech.rateLimit.rules.hits'), width: 110 },
      {
        field: 'blocked_count',
        headerName: t('tech.rateLimit.systems.blocked'),
        width: 120,
        cellRenderer: renderBlocked,
      },
      dateColumn<RateLimitRuleRow>({
        field: 'last_blocked_at',
        headerName: t('tech.rateLimit.rules.lastBreach'),
        hide: false,
        width: 190,
      }),
      actionsColumn<RateLimitRuleRow>({ width: 120, onEdit, onDelete: onRemove }),
    ];
  }, [onEdit, onRemove, onToggle, t]);

  return (
    <DuncitTable<RateLimitRuleRow>
      tableId="tech-rate-limit-rules"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('tech.rateLimit.rules.empty')}
      searchPlaceholder={t('tech.rateLimit.rules.searchPlaceholder')}
      defaultSort={{ field: 'priority', dir: 'asc' }}
      refetchRef={refetchRef}
    />
  );
}
