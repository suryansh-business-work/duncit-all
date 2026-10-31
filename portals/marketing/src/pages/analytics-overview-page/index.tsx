import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import AnalyticsLayout, { KpiGrid, MetricCard, type Kpi } from '../analytics-shared/AnalyticsLayout';
import { useAnalyticsWindow } from '../analytics-shared/useAnalyticsWindow';
import { dayLabels, useFigures, type Figures } from '../analytics-shared/format';
import { introSteps, kpi, kpiLabel } from '../analytics-shared/copy';
import { MARKETING_ANALYTICS_OVERVIEW, type AnalyticsOverview } from '../analytics-shared/queries';
import LineTrendChart from '../social-accounts-page/analytics/LineTrendChart';

type Translate = ReturnType<typeof useTranslation>['t'];

export function overviewTiles(o: AnalyticsOverview, f: Figures, t: Translate): Kpi[] {
  return [
    kpi(t, 'followers', f.count(o.social.followers)),
    kpi(t, 'followerGrowth', f.count(o.social.follower_growth)),
    kpi(t, 'engagement', f.count(o.social.engagement)),
    kpi(t, 'engagementRate', f.percent(o.social.engagement_rate)),
    kpi(t, 'fromDuncit', f.count(o.content.from_duncit)),
    kpi(t, 'reelsPosted', f.count(o.content.reels_posted)),
    kpi(t, 'newLeads', f.count(o.funnel.new_leads)),
    kpi(t, 'converted', f.count(o.funnel.converted)),
    kpi(t, 'promoted', f.count(o.funnel.promoted)),
    kpi(t, 'runs', f.count(o.automation.runs)),
    kpi(t, 'successRate', f.percent(o.automation.success_rate)),
    kpi(t, 'aiCost', f.usd(o.automation.cost)),
    kpi(t, 'clicks', f.count(o.links.clicks)),
    kpi(t, 'conversions', f.count(o.links.conversions)),
    kpi(t, 'revenue', f.inr(o.links.revenue)),
  ];
}

/** Marketing › Analytics › Overview: the headline of every analytics page, and what the links earned. */
export default function AnalyticsOverviewPage() {
  const { t } = useTranslation();
  const figures = useFigures();
  const range = useAnalyticsWindow();
  const { data, error } = useQuery<{ marketingAnalyticsOverview: AnalyticsOverview }>(MARKETING_ANALYTICS_OVERVIEW, {
    variables: { input: range.input },
  });
  const overview = data?.marketingAnalyticsOverview;
  const title = t('marketing.analytics.trendTitle');

  return (
    <AnalyticsLayout
      id="overview"
      title={t('marketing.analytics.overviewTitle')}
      summary={t('marketing.analytics.overviewSummary')}
      steps={introSteps(t)}
      range={range}
      error={error}
      ready={Boolean(overview)}
      empty={false}
    >
      {overview && (
        <>
          <KpiGrid tiles={overviewTiles(overview, figures, t)} />
          <MetricCard title={title} help={t('marketing.analytics.trendHelp')}>
            <LineTrendChart
              labels={dayLabels(overview.window.days)}
              series={[
                { label: kpiLabel(t, 'engagement'), values: overview.daily.engagement },
                { label: kpiLabel(t, 'newLeads'), values: overview.daily.new_leads },
                { label: kpiLabel(t, 'clicks'), values: overview.daily.clicks },
              ]}
              ariaLabel={title}
              testId="overview-trend"
            />
          </MetricCard>
        </>
      )}
    </AnalyticsLayout>
  );
}
