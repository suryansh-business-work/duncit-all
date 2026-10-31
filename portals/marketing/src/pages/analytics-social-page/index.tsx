import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import AnalyticsLayout, { CardGrid, KpiGrid, MetricCard } from '../analytics-shared/AnalyticsLayout';
import { useAnalyticsWindow } from '../analytics-shared/useAnalyticsWindow';
import { dayLabels, labelOf, useFigures } from '../analytics-shared/format';
import { introSteps, kpi, kpiLabel } from '../analytics-shared/copy';
import { MARKETING_ANALYTICS_SOCIAL, type AnalyticsSocial } from '../analytics-shared/queries';
import LineTrendChart from '../social-accounts-page/analytics/LineTrendChart';
import BarBreakdownChart from '../social-accounts-page/analytics/BarBreakdownChart';
import { PLATFORM_LABEL } from '../social-accounts-page/copy';
import TopPostsTable from './TopPostsTable';

/** Nothing connected and nothing posted: one empty state says so, rather than a grid of zeros. */
export const isEmptySocial = (s: AnalyticsSocial) => s.accounts.length === 0 && s.posts === 0;

/** Marketing › Analytics › Social: followers, posts, reach and engagement per network and per day. */
export default function AnalyticsSocialPage() {
  const { t } = useTranslation();
  const f = useFigures();
  const range = useAnalyticsWindow();
  const { data, error } = useQuery<{ marketingAnalyticsSocial: AnalyticsSocial }>(MARKETING_ANALYTICS_SOCIAL, { variables: { input: range.input } });
  const social = data?.marketingAnalyticsSocial;
  const trendTitle = t('marketing.analytics.socialTrendTitle');
  const networkTitle = t('marketing.analytics.byNetworkTitle');
  const growthTitle = t('marketing.analytics.growthTitle');

  return (
    <AnalyticsLayout
      id="social"
      title={t('marketing.analytics.socialTitle')}
      summary={t('marketing.analytics.socialSummary')}
      steps={introSteps(t)}
      range={range}
      showPlatforms
      error={error}
      ready={Boolean(social)}
      empty={social ? isEmptySocial(social) : false}
    >
      {social && (
        <>
          <KpiGrid
            tiles={[
              kpi(t, 'followers', f.count(social.followers)),
              kpi(t, 'followerGrowth', f.count(social.follower_growth)),
              kpi(t, 'posts', f.count(social.posts)),
              kpi(t, 'views', f.count(social.views)),
              kpi(t, 'engagement', f.count(social.engagement)),
              kpi(t, 'engagementRate', f.percent(social.engagement_rate)),
            ]}
          />
          <MetricCard title={trendTitle} help={t('marketing.analytics.socialTrendHelp')}>
            <LineTrendChart
              labels={dayLabels(social.window.days)}
              series={[
                { label: kpiLabel(t, 'engagement'), values: social.daily.engagement },
                { label: kpiLabel(t, 'views'), values: social.daily.views },
              ]}
              ariaLabel={trendTitle}
              testId="social-trend"
            />
          </MetricCard>
          <CardGrid>
            <MetricCard title={networkTitle} help={t('marketing.analytics.byNetworkHelp')}>
              <BarBreakdownChart
                labels={social.networks.map((row) => labelOf(PLATFORM_LABEL, row.platform, t))}
                series={[
                  { label: kpiLabel(t, 'engagement'), values: social.networks.map((row) => row.engagement) },
                  { label: kpiLabel(t, 'posts'), values: social.networks.map((row) => row.posts) },
                ]}
                ariaLabel={networkTitle}
                testId="social-networks"
              />
            </MetricCard>
            <MetricCard title={growthTitle} help={t('marketing.analytics.growthHelp')}>
              <BarBreakdownChart
                labels={social.accounts.map((row) => row.name)}
                series={[{ label: kpiLabel(t, 'followerGrowth'), values: social.accounts.map((row) => row.growth) }]}
                ariaLabel={growthTitle}
                testId="social-growth"
              />
            </MetricCard>
          </CardGrid>
          <MetricCard title={t('marketing.analytics.topPostsTitle')} help={t('marketing.analytics.topPostsHelp')}>
            <TopPostsTable rows={social.top_posts} />
          </MetricCard>
        </>
      )}
    </AnalyticsLayout>
  );
}
