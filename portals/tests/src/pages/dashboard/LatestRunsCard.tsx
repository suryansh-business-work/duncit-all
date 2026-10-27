import { Divider, Stack } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { TestsOverview } from '@duncit/gql-types';
import RunRow from './RunRow';

type Props = Readonly<{ overview: Pick<TestsOverview, 'unit' | 'e2e' | 'stress'> }>;

/** The last finished unit, E2E and stress run, each one click from its own page. */
export default function LatestRunsCard({ overview }: Props) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const { unit, e2e, stress } = overview;
  const counts = (r: { passed: number; failed: number; skipped: number }) =>
    t('tests.dashboard.runs.tests', {
      vars: { passed: String(r.passed), failed: String(r.failed), skipped: String(r.skipped) },
    });
  const finished = (when: string | null | undefined) =>
    when ? [t('tests.dashboard.runs.finished', { vars: { when: formatDateTime(when) } })] : [];

  const stressLines = stress
    ? [
        ...(stress.grade ? [t('tests.dashboard.runs.grade', { vars: { grade: stress.grade } })] : []),
        ...(stress.terminated ? [t('tests.dashboard.runs.terminated')] : []),
        ...finished(stress.ended_at),
      ]
    : [];

  return (
    <SectionCard title={t('tests.dashboard.runs.title')} subtitle={t('tests.dashboard.runs.subtitle')}>
      <Stack spacing={1.5} divider={<Divider flexItem />}>
        <RunRow
          title={t('tests.dashboard.runs.unit')}
          status={unit?.status ?? null}
          lines={unit ? [counts(unit), ...finished(unit.finished_at)] : []}
          to={unit ? `/unit/runs/${unit.run_id}` : '/unit/runs'}
        />
        <RunRow
          title={t('tests.dashboard.runs.e2e')}
          status={e2e?.status ?? null}
          lines={e2e ? [e2e.run_no, counts(e2e), ...finished(e2e.finished_at)] : []}
          to="/e2e/runs"
        />
        <RunRow
          title={t('tests.dashboard.runs.stress')}
          status={stress?.status ?? null}
          lines={stress ? [stress.run_no, ...stressLines] : []}
          to={stress ? `/stress-testing/runs/${stress.run_id}` : '/stress-testing/runs'}
        />
      </Stack>
    </SectionCard>
  );
}
