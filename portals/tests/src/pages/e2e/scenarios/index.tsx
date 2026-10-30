import { useQuery } from '@apollo/client/react';
import { Link as RouterLink, useParams } from 'react-router';
import { Box, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { DuncitTabs, tabPanelProps, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { E2E_RUN_HEAD, type E2eRunHead } from './queries';
import ScenariosTable from './ScenariosTable';

type ScenarioTab = 'all' | 'failed';
const TABS_ID = 'e2e-run-scenarios';

/**
 * Every scenario one E2E run held, at its own address — reloadable and
 * pasteable into a ticket. The run's dialog links here; the Failed tab is the
 * list worth reading first.
 */
export default function E2eScenariosPage() {
  const { t } = useTranslation();
  const { runId = '' } = useParams();
  const query = useQuery<{ e2eRun: E2eRunHead | null }>(E2E_RUN_HEAD, {
    variables: { id: runId },
    fetchPolicy: 'cache-and-network',
  });
  const run = query.data?.e2eRun ?? null;

  const items: DuncitTabItem<ScenarioTab>[] = [
    { value: 'all', label: t('tech.e2eScenarios.tabAll') },
    { value: 'failed', label: t('tech.e2eScenarios.tabFailed', { vars: { count: run?.totals.failed ?? 0 } }) },
  ];
  const tabs = useTabParam<ScenarioTab>({ items, fallback: 'all' });

  return (
    <QueryGuard
      loading={query.loading && !run}
      error={query.error}
      errorText={t('tech.e2eScenarios.loadFailed')}
      notFound={!query.loading && !query.error && !run}
      notFoundText={t('tech.e2eScenarios.notFound')}
    >
      {run && (
        <Stack spacing={2.5}>
          <Stack spacing={1.5}>
            <Link
              component={RouterLink}
              to="/e2e/runs"
              underline="hover"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, width: 'fit-content' }}
            >
              <ArrowBackIcon fontSize="small" />
              {t('tech.e2eScenarios.back')}
            </Link>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 800 }}>
              {t('tech.e2eScenarios.title', { vars: { run: run.run_no } })}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('tech.e2eScenarios.subtitle', {
                vars: {
                  tests: run.totals.tests,
                  passed: run.totals.passed,
                  failed: run.totals.failed,
                  skipped: run.totals.skipped,
                },
              })}
            </Typography>
          </Stack>
          <Box>
            <DuncitTabs {...tabs} idPrefix={TABS_ID} variant="scrollable" allowScrollButtonsMobile />
            <Box {...tabPanelProps(TABS_ID, tabs.value)} sx={{ pt: 2 }}>
              {tabs.value === 'all' && <ScenariosTable runId={run.id} />}
              {tabs.value === 'failed' && <ScenariosTable runId={run.id} failedOnly />}
            </Box>
          </Box>
        </Stack>
      )}
    </QueryGuard>
  );
}
