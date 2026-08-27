import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import type { RateLimitEventRow } from '../queries';
import { allowance, enumLabel } from '../labels';

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: RateLimitEventRow) => row.id;

const renderMode = (row: RateLimitEventRow, t: Translate) => (
  <Chip
    size="small"
    color={row.mode === 'ENFORCE' ? 'error' : 'warning'}
    variant={row.mode === 'ENFORCE' ? 'filled' : 'outlined'}
    label={enumLabel(t, row.mode)}
  />
);

/** Who overflowed: the counter key, with the account beneath it when known. */
const renderWho = (row: RateLimitEventRow) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {row.limit_key}
    </Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {row.user_email ?? row.ip}
    </Typography>
  </Stack>
);

/** What they were calling: a GraphQL field, or a method and a path. */
const renderWhat = (row: RateLimitEventRow) => (
  <Typography variant="body2" noWrap>
    {row.operation ?? `${row.method ?? ''} ${row.path ?? ''}`.trim()}
  </Typography>
);

const renderSystem = (row: RateLimitEventRow, t: Translate) => (
  <Stack sx={{ gap: 0.25, py: 0.5 }}>
    <Typography variant="body2">{enumLabel(t, row.surface)}</Typography>
    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
      {row.app}
    </Typography>
  </Stack>
);

interface Props {
  fetchRows: TableFetch<RateLimitEventRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
}

/** Every breach, refused or merely recorded. */
export default function BlockedTable({ fetchRows, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<RateLimitEventRow>[]>(
    () => [
      dateColumn<RateLimitEventRow>({
        field: 'created_at',
        headerName: t('tech.rateLimit.blocked.when'),
        hide: false,
        width: 190,
      }),
      {
        field: 'mode',
        headerName: t('tech.rateLimit.field.mode'),
        width: 120,
        filter: { type: 'text' },
        cellRenderer: (row) => renderMode(row, t),
        valueGetter: (row) => row.mode,
      },
      {
        field: 'rule_name',
        headerName: t('tech.rateLimit.blocked.rule'),
        flex: 1,
        minWidth: 190,
      },
      {
        field: 'limit_key',
        headerName: t('tech.rateLimit.blocked.who'),
        flex: 1,
        minWidth: 190,
        cellRenderer: renderWho,
      },
      {
        field: 'surface',
        headerName: t('tech.rateLimit.blocked.system'),
        width: 160,
        filter: { type: 'text' },
        cellRenderer: (row) => renderSystem(row, t),
        valueGetter: (row) => `${row.surface} ${row.app}`,
      },
      {
        field: 'operation',
        headerName: t('tech.rateLimit.blocked.what'),
        flex: 1,
        minWidth: 180,
        cellRenderer: renderWhat,
      },
      {
        field: 'count',
        headerName: t('tech.rateLimit.blocked.overBy'),
        width: 130,
        valueGetter: (row) => allowance(row.count, row.limit),
      },
      { field: 'retry_after', headerName: t('tech.rateLimit.blocked.retryAfter'), width: 130 },
    ],
    [t],
  );

  return (
    <DuncitTable<RateLimitEventRow>
      tableId="tech-rate-limit-blocked"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('tech.rateLimit.blocked.empty')}
      searchPlaceholder={t('tech.rateLimit.blocked.searchPlaceholder')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      refetchRef={refetchRef}
    />
  );
}
