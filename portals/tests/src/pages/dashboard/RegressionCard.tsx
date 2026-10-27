import { Divider, Stack, Typography } from '@mui/material';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { SectionCard } from '@duncit/ui';
import type { TestsRegressionSummary } from '@duncit/gql-types';
import RunRow from './RunRow';
import { regressionKindKey } from './status';

type Props = Readonly<{ reports: readonly TestsRegressionSummary[] }>;

/** The latest regression report of each kind: what broke since the run before. */
export default function RegressionCard({ reports }: Props) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  return (
    <SectionCard title={t('tests.dashboard.regression.title')} subtitle={t('tests.dashboard.regression.subtitle')}>
      {reports.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tests.dashboard.regression.empty')}
        </Typography>
      ) : (
        <Stack spacing={1.5} divider={<Divider flexItem />}>
          {reports.map((r) => (
            <RunRow
              key={r.report_id}
              title={t(regressionKindKey(r.kind))}
              status={r.status}
              lines={[
                t('tests.dashboard.regression.counts', {
                  vars: { regressed: String(r.regressed), fixed: String(r.fixed), newFailing: String(r.new_failing) },
                }),
                ...(r.created_at ? [formatDateTime(r.created_at)] : []),
              ]}
              to={`/regression/reports/${r.report_id}`}
            />
          ))}
        </Stack>
      )}
    </SectionCard>
  );
}
