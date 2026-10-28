import { useQuery } from '@apollo/client/react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { fireAndForget } from '@duncit/logs';
import { Loader, PageHeader } from '@duncit/ui';
import { testsLog } from '../../lib/logger';
import ConfidenceCard from './ConfidenceCard';
import CoverageCard from './CoverageCard';
import CoverageTrendCard from './CoverageTrendCard';
import LatestRunsCard from './LatestRunsCard';
import ManualCard from './ManualCard';
import RegressionCard from './RegressionCard';
import ScenarioCard from './ScenarioCard';
import { TESTS_OVERVIEW, type TestsOverviewData } from './queries';

/** Two equal columns from md up, one on a phone. */
const GRID_SX = { display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' } as const;

/**
 * The Tests console's home: the confidence score with every signal behind it,
 * code coverage and its trend, scenario coverage, the latest run of each kind,
 * regressions and the manual board — one request, read-only.
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { data, loading, error, refetch } = useQuery<TestsOverviewData>(TESTS_OVERVIEW, {
    fetchPolicy: 'cache-and-network',
  });
  const overview = data?.testsOverview;

  return (
    <Stack spacing={2.5}>
      <PageHeader title={t('tests.dashboard.title')} subtitle={t('tests.dashboard.subtitle')} />
      {error && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => fireAndForget(refetch(), testsLog, '/', 'DashboardPage')}>
              {t('tests.common.retry')}
            </Button>
          }
        >
          {t('tests.dashboard.loadFailed')}
        </Alert>
      )}
      {!overview && loading && <Loader />}
      {overview && (
        <>
          <Box sx={GRID_SX}>
            <ConfidenceCard overview={overview} />
            <Stack spacing={2}>
              <CoverageCard unit={overview.unit} />
              <CoverageTrendCard trend={overview.coverage_trend} />
            </Stack>
          </Box>
          <Box sx={GRID_SX}>
            <LatestRunsCard overview={overview} />
            <RegressionCard reports={overview.regressions} />
            <ScenarioCard scenario={overview.scenario} />
            <ManualCard manual={overview.manual} />
          </Box>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tests.dashboard.updated', { vars: { when: formatDateTime(overview.generated_at) } })}
          </Typography>
        </>
      )}
    </Stack>
  );
}
