import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Box, Link, Stack, Typography } from '@mui/material';
import { QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitDashboard } from '@duncit/dashboard';
import RangeSelect, { useRangeParam } from '../ai-features/RangeSelect';
import { buildFeatureWidgets } from './widgets';
import { AI_FEATURES_DASHBOARD, type FeaturesDashboard } from './queries';

/**
 * AI Features › Dashboard — how every AI feature is used over a range: cost,
 * calls, tokens, response time and failures, per day and per feature.
 *
 * Everything comes from one query whose totals are summed on the server from
 * the same per-feature rows the AI Features table lists, so the two pages
 * always agree. The range is the same `?days=` the table uses.
 */
export default function AiFeaturesDashboardPage() {
  const { t } = useTranslation();
  const { formatDay } = useDateFormat();
  const [rangeDays, setRangeDays] = useRangeParam();
  const { data, loading, error } = useQuery<{ aiFeaturesDashboard: FeaturesDashboard }>(AI_FEATURES_DASHBOARD, {
    variables: { range_days: rangeDays },
    fetchPolicy: 'cache-and-network',
  });
  const d = data?.aiFeaturesDashboard;
  const widgets = useMemo(() => (d ? buildFeatureWidgets(d, t, formatDay) : []), [d, t, formatDay]);

  const header = (
    <Stack spacing={2}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
      >
        <Box>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
            {t('ai.featuresDashboard.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('ai.featuresDashboard.subtitle')}
          </Typography>
          <Link component={RouterLink} to={`/ai-features?days=${rangeDays}`} variant="body2">
            {t('ai.featuresDashboard.allFeatures')}
          </Link>
        </Box>
        <RangeSelect value={rangeDays} onChange={setRangeDays} />
      </Stack>
      {d && d.unpriced_calls > 0 && (
        <Alert severity="warning">
          {t('ai.featuresDashboard.unpriced', { vars: { count: d.unpriced_calls } })}
        </Alert>
      )}
    </Stack>
  );

  if (!d) {
    return (
      <Stack spacing={3}>
        {header}
        <QueryGuard
          loading={loading}
          error={error}
          errorText={t('ai.featuresDashboard.loadFailed')}
          spinnerSx={{ py: 6 }}
        >
          {() => null}
        </QueryGuard>
      </Stack>
    );
  }
  return <DuncitDashboard dashboardId="ai.features" header={header} widgets={widgets} />;
}
