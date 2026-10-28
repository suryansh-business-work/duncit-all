import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { PageHeader } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useApolloTableFetch, type TableFetch } from '@duncit/table';
import { UNIT_RUNS_TABLE, type UnitRunRow } from '../queries';
import RunsTable from './RunsTable';
import RunNowButton from './RunNowButton';
import CoverageTrendChart from './CoverageTrendChart';

/**
 * A run takes the better part of an hour, so this is about watching a row
 * change state, not catching the second it does — often enough to feel live,
 * rare enough that nobody notices the traffic.
 */
const LIVE_POLL_MS = 15_000;

const isLive = (row: UnitRunRow) => row.status === 'QUEUED' || row.status === 'RUNNING';

/**
 * Unit Tests → Runs: every run sonar.yml and coverage.yml reported, the
 * coverage trend across them, and Run now.
 */
export default function UnitRunsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const [hasLive, setHasLive] = useState(false);
  const baseFetch = useApolloTableFetch<UnitRunRow>(client, UNIT_RUNS_TABLE, 'unitTestRunsTable');

  // The page it just fetched decides whether to keep polling: no live row on
  // screen, no timer. The server times stuck rows out, so this cannot spin forever.
  const fetchRows = useCallback<TableFetch<UnitRunRow>>(
    async (query) => {
      const page = await baseFetch(query);
      setHasLive(page.rows.some(isLive));
      return page;
    },
    [baseFetch]
  );

  useEffect(() => {
    if (!hasLive) return undefined;
    const timer = globalThis.setInterval(() => refetchRef.current?.(), LIVE_POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [hasLive]);

  const openRun = useCallback((row: UnitRunRow) => navigate(`/unit/runs/${row.id}`), [navigate]);
  const refresh = useCallback(() => refetchRef.current?.(), []);

  return (
    <Stack spacing={2.5}>
      <PageHeader
        title={t('testsUnit.runs.title')}
        subtitle={t('testsUnit.runs.subtitle')}
        actions={<RunNowButton onQueued={refresh} />}
      />
      <CoverageTrendChart />
      <RunsTable fetchRows={fetchRows} refetchRef={refetchRef} onRowClick={openRun} />
    </Stack>
  );
}
