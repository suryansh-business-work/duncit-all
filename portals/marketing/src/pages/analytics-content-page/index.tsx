import { useQuery } from '@apollo/client/react';
import { formatTime, useTranslation } from '@duncit/app-settings';
import AnalyticsLayout, { CardGrid, KpiGrid, MetricCard } from '../analytics-shared/AnalyticsLayout';
import { useAnalyticsWindow } from '../analytics-shared/useAnalyticsWindow';
import { labelOf, useFigures } from '../analytics-shared/format';
import { introSteps, kpi, kpiLabel } from '../analytics-shared/copy';
import { MARKETING_ANALYTICS_CONTENT, type AnalyticsContent } from '../analytics-shared/queries';
import BarBreakdownChart from '../social-accounts-page/analytics/BarBreakdownChart';
import { WEEKDAY_LABEL } from '../agents-page/copy';

const FORMAT_LABEL: Record<string, string> = {
  CAROUSEL: 'marketing.analytics.formatCarousel',
  VIDEO: 'marketing.analytics.formatVideo',
  SINGLE: 'marketing.analytics.formatSingle',
  TEXT: 'marketing.analytics.formatText',
};

/** Monday-first slot to the agents page's weekday copy, which is keyed by JavaScript day (0 = Sunday). */
const weekdayKey = (slot: number) => WEEKDAY_LABEL[(slot + 1) % 7];
// An hour of the day in the admin's time format, read off any one day.
const hourLabel = (hour: number) => formatTime(new Date(2026, 0, 1, hour));

export const isEmptyContent = (c: AnalyticsContent) => c.from_duncit === 0 && c.from_networks === 0 && c.reels_made === 0;

/** Marketing › Analytics › Content & Reels: what was made here, in which format, and when posts do best. */
export default function AnalyticsContentPage() {
  const { t } = useTranslation();
  const f = useFigures();
  const range = useAnalyticsWindow();
  const { data, error } = useQuery<{ marketingAnalyticsContent: AnalyticsContent }>(MARKETING_ANALYTICS_CONTENT, { variables: { input: range.input } });
  const content = data?.marketingAnalyticsContent;
  const formatTitle = t('marketing.analytics.formatsTitle');
  const reelsTitle = t('marketing.analytics.topReelsTitle');
  const weekdayTitle = t('marketing.analytics.weekdayTitle');
  const hourTitle = t('marketing.analytics.hourTitle');

  return (
    <AnalyticsLayout
      id="content"
      title={t('marketing.analytics.contentTitle')}
      summary={t('marketing.analytics.contentSummary')}
      steps={introSteps(t)}
      range={range}
      showPlatforms
      error={error}
      ready={Boolean(content)}
      empty={content ? isEmptyContent(content) : false}
    >
      {content && (
        <>
          <KpiGrid
            tiles={[
              kpi(t, 'fromDuncit', f.count(content.from_duncit)),
              kpi(t, 'fromNetworks', f.count(content.from_networks)),
              kpi(t, 'reelsMade', f.count(content.reels_made)),
              kpi(t, 'reelsPosted', f.count(content.reels_posted)),
              kpi(t, 'reelViews', f.count(content.reel_views)),
              {
                key: 'bestTime',
                label: t('marketing.analytics.bestTime'),
                value:
                  content.best_weekday === null || content.best_hour === null
                    ? t('marketing.analytics.noBestTime')
                    : `${t(weekdayKey(content.best_weekday))} ${hourLabel(content.best_hour)}`,
                hint: t('marketing.analytics.bestTimeHint'),
              },
            ]}
          />
          <CardGrid>
            <MetricCard title={formatTitle} help={t('marketing.analytics.formatsHelp')}>
              <BarBreakdownChart
                labels={content.formats.map((row) => labelOf(FORMAT_LABEL, row.format, t))}
                series={[
                  { label: kpiLabel(t, 'posts'), values: content.formats.map((row) => row.posts) },
                  { label: kpiLabel(t, 'engagement'), values: content.formats.map((row) => row.engagement) },
                ]}
                ariaLabel={formatTitle}
                testId="content-formats"
              />
            </MetricCard>
            <MetricCard title={reelsTitle} help={t('marketing.analytics.topReelsHelp')}>
              <BarBreakdownChart
                labels={content.top_reels.map((row) => row.name || t('marketing.analytics.deletedReel'))}
                series={[{ label: kpiLabel(t, 'views'), values: content.top_reels.map((row) => row.views) }]}
                ariaLabel={reelsTitle}
                testId="content-reels"
              />
            </MetricCard>
            <MetricCard title={weekdayTitle} help={t('marketing.analytics.timingHelp')}>
              <BarBreakdownChart
                horizontal={false}
                labels={content.by_weekday.map((_value, slot) => t(weekdayKey(slot)))}
                series={[{ label: kpiLabel(t, 'engagement'), values: content.by_weekday }]}
                ariaLabel={weekdayTitle}
                testId="content-weekday"
              />
            </MetricCard>
            <MetricCard title={hourTitle} help={t('marketing.analytics.timingHelp')}>
              <BarBreakdownChart
                horizontal={false}
                labels={content.by_hour.map((_value, hour) => hourLabel(hour))}
                series={[{ label: kpiLabel(t, 'engagement'), values: content.by_hour }]}
                ariaLabel={hourTitle}
                testId="content-hour"
              />
            </MetricCard>
          </CardGrid>
        </>
      )}
    </AnalyticsLayout>
  );
}
