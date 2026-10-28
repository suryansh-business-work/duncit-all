import { useCallback, useMemo } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router';
import { Alert, Stack } from '@mui/material';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import TableRowsOutlinedIcon from '@mui/icons-material/TableRowsOutlined';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { PageHeader, QueryGuard, useDebouncedValue } from '@duncit/ui';
import BoardFilters from './BoardFilters';
import KanbanBoard from './KanbanBoard';
import { toBoardFilter, useBoardFilters } from './useBoardFilters';
import { useBoardData } from './useBoardData';
import { useMoveCase } from './useMoveCase';

/**
 * Manual Testing > Board — every case as a card in its column. Drag a card (or
 * pick it up with Space) to change its status or order; click it, or press
 * Enter on it, to open the case.
 */
export default function ManualBoardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const filters = useBoardFilters();
  const search = useDebouncedValue(filters.values.search, 300);
  const { assignee, type, priority, label, surface } = filters.values;
  // Built from the values themselves, so typing (before the debounce settles) keeps the same filter.
  const filter = useMemo(
    () => toBoardFilter({ search, assignee, type, priority, label, surface }),
    [search, assignee, type, priority, label, surface]
  );
  const board = useBoardData(filter);
  const move = useMoveCase(board.variables, board.reload);
  const open = useCallback((key: string) => navigate(`/manual/cases/${encodeURIComponent(key)}`), [navigate]);

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <PageHeader
        title={t('testsManual.board.title')}
        subtitle={t('testsManual.board.subtitle')}
        actions={
          <Stack direction="row" spacing={1}>
            <DuncitButton component={RouterLink} to="/manual/cases" startIcon={<TableRowsOutlinedIcon />}>
              {t('testsManual.board.allCases')}
            </DuncitButton>
            <DuncitButton component={RouterLink} to="/manual/settings" startIcon={<SettingsOutlinedIcon />}>
              {t('testsManual.board.columns')}
            </DuncitButton>
          </Stack>
        }
      />
      <BoardFilters
        values={filters.values}
        active={filters.active}
        onChange={filters.setValue}
        onClear={filters.clear}
      />
      {board.hasData && board.error ? (
        <Alert
          severity="warning"
          action={
            <DuncitButton color="inherit" size="small" onClick={board.reload}>
              {t('shell.common.retry')}
            </DuncitButton>
          }
        >
          {t('testsManual.board.refreshFailed')}
        </Alert>
      ) : null}
      <QueryGuard
        loading={board.loading && !board.hasData}
        error={board.hasData ? undefined : board.error}
        loadingLabel={t('testsManual.board.loading')}
      >
        {board.columns.length === 0 ? (
          <Alert severity="info">{t('testsManual.board.noColumns')}</Alert>
        ) : (
          <KanbanBoard
            columns={board.columns}
            filtered={filters.active}
            loadingMore={board.loadingMore}
            onMove={move}
            onLoadMore={board.loadMore}
            onOpen={open}
            onCreated={board.reload}
          />
        )}
      </QueryGuard>
    </Stack>
  );
}
