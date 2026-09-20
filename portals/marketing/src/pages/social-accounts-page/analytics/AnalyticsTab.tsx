import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { SOCIAL_ANALYTICS, type SocialAccount, type SocialAnalytics } from '../queries';
import AnalyticsFilters, { type Period } from './AnalyticsFilters';
import SocialKpis from './SocialKpis';
import AnalyticsCharts from './AnalyticsCharts';
import TimingCharts from './TimingCharts';
import AiInsightsCard from './AiInsightsCard';

/**
 * How the connected accounts are doing: the period's numbers, the charts that
 * explain them — over time, by account and network, by day and hour — and the
 * AI's read of all of it. Every post, one by one, is on the Posts tab.
 */
export default function AnalyticsTab({ accounts }: Readonly<{ accounts: SocialAccount[] }>) {
  const { t } = useTranslation();
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [days, setDays] = useState<Period>(30);
  const input = useMemo(() => ({ account_ids: accountIds.length > 0 ? accountIds : null, days }), [accountIds, days]);
  const { data, loading, error } = useQuery<{ socialAnalytics: SocialAnalytics }>(SOCIAL_ANALYTICS, {
    variables: { input },
    fetchPolicy: 'cache-and-network',
  });
  const analytics = data?.socialAnalytics;

  return (
    <Stack spacing={2} data-testid="social-analytics">
      <AnalyticsFilters accounts={accounts} accountIds={accountIds} onAccountIds={setAccountIds} days={days} onDays={setDays} />
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <SocialKpis data={analytics} loading={loading} />
      {accounts.length === 0 && (
        <Alert severity="info" variant="outlined">
          {t('marketing.social.noData')}
        </Alert>
      )}
      {accounts.length > 0 && <AiInsightsCard input={input} />}
      {accounts.length > 0 && analytics && (
        <>
          <AnalyticsCharts analytics={analytics} />
          <TimingCharts analytics={analytics} />
        </>
      )}
    </Stack>
  );
}
