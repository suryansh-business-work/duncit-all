import { useEffect, useMemo, useRef } from 'react';
import { Box, Tooltip, Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import { usd, tokens } from '../../lib/usd';
import FeatureSwitch from './FeatureSwitch';
import type { AiFeature } from './queries';

interface Props {
  rows: readonly AiFeature[];
  pendingKey: string | null;
  onToggle: (feature: AiFeature, enabled: boolean) => void;
  /** Opens the feature's own logs page. */
  onOpen: (feature: AiFeature) => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

const getRowId = (row: AiFeature) => row.key;
const searchOf = (row: AiFeature) => `${row.label} ${row.module} ${row.key} ${row.description}`;

const renderFeature = (row: AiFeature) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap title={row.description} sx={{ fontWeight: 600 }}>
      {row.label}
    </Typography>
    <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
      {row.key}
    </Typography>
  </Box>
);

/** A cost on an unrated model is a floor, so it says so instead of looking exact. */
const makeRenderCost = (t: Translate) => (row: AiFeature) => {
  const amount = (
    <Typography variant="body2" sx={{ fontWeight: 700 }}>
      {usd(row.cost_usd)}
    </Typography>
  );
  if (row.unpriced_calls === 0) return amount;
  return (
    <Tooltip title={t('ai.features.unpricedNote', { vars: { count: row.unpriced_calls } })}>
      <Box sx={{ color: 'warning.main' }}>{amount}</Box>
    </Tooltip>
  );
};

/** The on/off switch cell, busy while that feature's toggle is saving. */
const makeRenderStatus =
  (pendingKey: string | null, onToggle: Props['onToggle']) => (row: AiFeature) => (
    <FeatureSwitch feature={row} busy={pendingKey === row.key} onToggle={onToggle} />
  );

/**
 * Every AI feature, its switch and its spend. The list is the server catalogue
 * (a few dozen rows), so it is filtered and sorted client-side; a feature's
 * calls are paged by the server on its own page.
 */
export default function FeaturesTable({ rows, pendingKey, onToggle, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<AiFeature>[]>(
    () => [
      {
        field: 'label',
        headerName: t('ai.features.colFeature'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        cellRenderer: renderFeature,
        valueGetter: (row) => row.label,
      },
      { field: 'module', headerName: t('ai.features.colArea'), width: 130, type: 'text', valueGetter: (row) => row.module },
      {
        field: 'enabled',
        headerName: t('ai.features.colStatus'),
        width: 120,
        type: 'text',
        cellRenderer: makeRenderStatus(pendingKey, onToggle),
        valueGetter: (row) => (row.enabled ? t('ai.features.on') : t('ai.features.off')),
      },
      { field: 'calls', headerName: t('ai.features.colCalls'), width: 100, type: 'number', valueGetter: (row) => row.calls },
      {
        field: 'prompt_tokens',
        headerName: t('ai.features.colInputTokens'),
        width: 130,
        type: 'number',
        cellRenderer: (row) => tokens(row.prompt_tokens),
        valueGetter: (row) => row.prompt_tokens,
      },
      {
        field: 'completion_tokens',
        headerName: t('ai.features.colOutputTokens'),
        width: 130,
        type: 'number',
        cellRenderer: (row) => tokens(row.completion_tokens),
        valueGetter: (row) => row.completion_tokens,
      },
      {
        field: 'cost_usd',
        headerName: t('ai.features.colCost'),
        width: 120,
        type: 'number',
        cellRenderer: makeRenderCost(t),
        valueGetter: (row) => row.cost_usd,
      },
      dateColumn<AiFeature>({
        field: 'last_called_at',
        headerName: t('ai.features.colLastCall'),
        width: 165,
        hide: false,
      }),
    ],
    [pendingKey, onToggle, t]
  );
  const fetchRows = useMemo(() => clientTableFetch<AiFeature>(rows, searchOf, columns), [rows, columns]);
  // DuncitTable reloads on its own query state, not on a new fetchRows — ask it
  // to reload when the rows change (a range switch, a saved toggle).
  const refetchRef = useRef<(() => void) | null>(null);
  const firstRows = useRef(true);
  useEffect(() => {
    if (firstRows.current) {
      firstRows.current = false;
      return;
    }
    refetchRef.current?.();
  }, [fetchRows]);

  return (
    <DuncitTable<AiFeature>
      ariaLabel={t('ai.features.title')}
      tableId="ai-features"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('ai.features.empty')}
      defaultSort={{ field: 'cost_usd', dir: 'desc' }}
      searchPlaceholder={t('ai.features.search')}
      refetchRef={refetchRef}
      onRowClick={onOpen}
    />
  );
}
