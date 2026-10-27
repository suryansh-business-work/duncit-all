import { Link as RouterLink } from 'react-router';
import { Button, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { TestsScenarioCoverage } from '@duncit/gql-types';
import Meter from './Meter';
import { pct } from './status';

type Props = Readonly<{ scenario: TestsScenarioCoverage }>;

/** How much of the E2E flow catalogue a person has reviewed as ready to become automated tests. */
export default function ScenarioCard({ scenario }: Props) {
  const { t } = useTranslation();
  const { sub_flows: total } = scenario;
  const rows = [
    { key: 'tests.dashboard.scenario.looksGood', count: scenario.looks_good },
    { key: 'tests.dashboard.scenario.needsReview', count: scenario.needs_review },
    { key: 'tests.dashboard.scenario.notReviewed', count: scenario.not_reviewed },
  ] as const;

  return (
    <SectionCard
      title={t('tests.dashboard.scenario.title')}
      subtitle={t('tests.dashboard.scenario.subtitle')}
      action={
        <Button component={RouterLink} to="/e2e/flows" size="small">
          {t('tests.dashboard.scenario.open')}
        </Button>
      }
    >
      {total > 0 ? (
        <Stack spacing={1.75}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('tests.dashboard.scenario.summary', {
              vars: { flows: String(scenario.flows), subFlows: String(total) },
            })}
          </Typography>
          {rows.map((row) => (
            <Meter
              key={row.key}
              label={t(row.key)}
              value={pct(row.count, total)}
              caption={String(row.count)}
            />
          ))}
        </Stack>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tests.dashboard.scenario.empty')}
        </Typography>
      )}
    </SectionCard>
  );
}
