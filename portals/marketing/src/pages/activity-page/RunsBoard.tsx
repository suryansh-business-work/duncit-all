import { useCallback, useRef, useState } from 'react';
import { Box } from '@mui/material';
import type { TableFilterValue } from '@duncit/table';
import type { MarketingRunRow } from './queries';
import RunsLegend from './RunsLegend';
import RunsTable from './RunsTable';
import RunDrawer from './RunDrawer';

interface Props {
  tableId?: string;
  extraFilters?: ReadonlyArray<TableFilterValue>;
  emptyText: string;
}

/**
 * The legend, the grid and the drawer, wired together: a row opens its run,
 * and an action in the drawer reloads the grid so the row's status follows.
 * Activity, Approvals and My Tasks each render one with their own pins.
 */
export default function RunsBoard({ tableId, extraFilters, emptyText }: Readonly<Props>) {
  const [openId, setOpenId] = useState<string | null>(null);
  const refetchRef = useRef<(() => void) | null>(null);

  const open = useCallback((run: MarketingRunRow) => setOpenId(run.id), []);
  const close = useCallback(() => setOpenId(null), []);
  const reload = useCallback(() => {
    refetchRef.current?.();
  }, []);

  return (
    <>
      <RunsLegend />
      <Box data-tour="runs-table" data-testid="runs-board">
        <RunsTable tableId={tableId} extraFilters={extraFilters} emptyText={emptyText} onOpen={open} refetchRef={refetchRef} />
      </Box>
      <RunDrawer runId={openId} onClose={close} onChanged={reload} />
    </>
  );
}
