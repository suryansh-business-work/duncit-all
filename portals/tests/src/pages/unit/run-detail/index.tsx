import { useEffect, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useParams } from 'react-router';
import { Box, Stack } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { useApolloTableFetch } from '@duncit/table';
import FilesTable from '../components/FilesTable';
import { UNIT_FILES_TABLE, UNIT_RUN, type UnitFileRow, type UnitRunDetail } from '../queries';
import RunHeader from './RunHeader';
import RunMetrics from './RunMetrics';
import WorkspacesTab from './WorkspacesTab';
import CasesTab from './CasesTab';
import CoverageTab from './CoverageTab';

type RunTab = 'workspaces' | 'cases' | 'failures' | 'coverage' | 'files';

/** A live run's row changes once a minute at most; the table under it is read on demand. */
const LIVE_POLL_MS = 15_000;
const TABS_ID = 'unit-run';

const isLive = (run: UnitRunDetail | null) => run?.status === 'QUEUED' || run?.status === 'RUNNING';

/** The run's test files, read from the server page by page. */
function FilesTab({ runId }: Readonly<{ runId: string }>) {
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<UnitFileRow>(
    client,
    UNIT_FILES_TABLE,
    'unitTestFilesTable',
    { extraVariables: { run_id: runId } },
    [runId]
  );
  return <FilesTable tableId="tests-unit-run-files" fetchRows={fetchRows} />;
}

/**
 * One unit run at its own address: the verdict and the numbers, then the run
 * by workspace, test, failure, coverage and test file — each a tab in the URL.
 */
export default function UnitRunDetailPage() {
  const { t } = useTranslation();
  const { runId = '' } = useParams();
  const [live, setLive] = useState(false);
  // Polls only while the run it last read is live.
  const query = useQuery<{ unitTestRun: UnitRunDetail | null }>(UNIT_RUN, {
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
    pollInterval: live ? LIVE_POLL_MS : 0,
  });
  const run = query.data?.unitTestRun ?? null;
  useEffect(() => {
    setLive(isLive(run));
  }, [run]);

  const items: DuncitTabItem<RunTab>[] = [
    { value: 'workspaces', label: t('testsUnit.tabs.workspaces') },
    { value: 'cases', label: t('testsUnit.tabs.cases') },
    { value: 'failures', label: t('testsUnit.tabs.failuresCount', { vars: { count: run?.totals.failed ?? 0 } }) },
    { value: 'coverage', label: t('testsUnit.tabs.coverage') },
    { value: 'files', label: t('testsUnit.tabs.files') },
  ];
  const tabs = useTabParam<RunTab>({ items, fallback: 'workspaces' });

  return (
    <QueryGuard
      loading={query.loading && !run}
      error={query.error}
      errorText={t('testsUnit.common.loadFailed')}
      notFound={!query.loading && !query.error && !run}
      notFoundText={t('testsUnit.detail.notFound')}
    >
      {run && (
        <Stack spacing={2.5}>
          <RunHeader run={run} />
          <RunMetrics run={run} />
          <Box>
            <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" allowScrollButtonsMobile />
            <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={{ pt: 2 }}>
              {tabs.value === 'workspaces' && <WorkspacesTab workspaces={run.workspaces} />}
              {tabs.value === 'cases' && <CasesTab runId={run.id} />}
              {tabs.value === 'failures' && <CasesTab runId={run.id} failuresOnly />}
              {tabs.value === 'coverage' && <CoverageTab workspaces={run.workspaces} />}
              {tabs.value === 'files' && <FilesTab runId={run.id} />}
            </Box>
          </Box>
        </Stack>
      )}
    </QueryGuard>
  );
}
