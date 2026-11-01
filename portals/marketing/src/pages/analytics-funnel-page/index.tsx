import { useQuery } from '@apollo/client/react';
import { useSearchParams } from 'react-router';
import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import AnalyticsLayout, { CardGrid, KpiGrid, MetricCard } from '../analytics-shared/AnalyticsLayout';
import { useAnalyticsWindow } from '../analytics-shared/useAnalyticsWindow';
import { dayLabels, labelOf, useFigures } from '../analytics-shared/format';
import { introSteps, kpi, kpiLabel } from '../analytics-shared/copy';
import { MARKETING_ANALYTICS_FUNNEL, type AnalyticsFunnel } from '../analytics-shared/queries';
import LineTrendChart from '../social-accounts-page/analytics/LineTrendChart';
import BarBreakdownChart from '../social-accounts-page/analytics/BarBreakdownChart';
import { PIPELINES, PIPELINE_LABEL, SOURCE_LABEL, STAGE_LABEL } from '../leads-page/copy';

const ALL = 'ALL';

/** Which pipeline to read, kept in the URL beside the window; empty reads every pipeline. */
function PipelinePicker() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const value = params.get('pipeline') ?? ALL;
  return (
    <TextField
      select
      size="small"
      label={t('marketing.analytics.pipeline')}
      value={value}
      onChange={(event) => {
        const next = new URLSearchParams(params);
        if (event.target.value === ALL) next.delete('pipeline');
        else next.set('pipeline', event.target.value);
        setParams(next, { replace: true });
      }}
      sx={{ minWidth: 180 }}
      data-testid="analytics-pipeline"
    >
      <MenuItem value={ALL}>{t('marketing.analytics.allPipelines')}</MenuItem>
      {PIPELINES.map((pipeline) => (
        <MenuItem key={pipeline} value={pipeline}>
          {t(PIPELINE_LABEL[pipeline])}
        </MenuItem>
      ))}
    </TextField>
  );
}

/** Marketing › Analytics › Leads & Funnel: where leads came from, how far they got and how fast. */
export default function AnalyticsFunnelPage() {
  const { t } = useTranslation();
  const f = useFigures();
  const range = useAnalyticsWindow();
  const [params] = useSearchParams();
  const pipeline = PIPELINES.find((known) => known === params.get('pipeline')) ?? null;
  const { data, error } = useQuery<{ marketingAnalyticsFunnel: AnalyticsFunnel }>(MARKETING_ANALYTICS_FUNNEL, {
    // The window's networks mean nothing to leads; only the days are sent.
    variables: { input: { from: range.input.from, to: range.input.to }, pipeline },
  });
  const funnel = data?.marketingAnalyticsFunnel;
  const trendTitle = t('marketing.analytics.leadsTrendTitle');
  const funnelTitle = t('marketing.analytics.funnelTitle');
  const sourceTitle = t('marketing.analytics.sourceTitle');
  const stageTimeTitle = t('marketing.analytics.stageTimeTitle');
  const stageLabel = (stage: string) => labelOf(STAGE_LABEL, stage, t);

  return (
    <AnalyticsLayout
      id="funnel"
      title={t('marketing.analytics.funnelPageTitle')}
      summary={t('marketing.analytics.funnelSummary')}
      steps={introSteps(t)}
      range={range}
      showPlatforms={false}
      extra={<PipelinePicker />}
      error={error}
      ready={Boolean(funnel)}
      empty={funnel ? funnel.new_leads === 0 && funnel.converted === 0 && funnel.promoted === 0 : false}
    >
      {funnel && (
        <>
          <KpiGrid
            tiles={[
              kpi(t, 'newLeads', f.count(funnel.new_leads)),
              kpi(t, 'converted', f.count(funnel.converted)),
              kpi(t, 'promoted', f.count(funnel.promoted)),
            ]}
          />
          <MetricCard title={trendTitle} help={t('marketing.analytics.leadsTrendHelp')}>
            <LineTrendChart labels={dayLabels(funnel.window.days)} series={[{ label: kpiLabel(t, 'newLeads'), values: funnel.daily_new }]} ariaLabel={trendTitle} testId="funnel-trend" />
          </MetricCard>
          <CardGrid>
            <MetricCard title={funnelTitle} help={t('marketing.analytics.funnelHelp')}>
              <BarBreakdownChart
                labels={funnel.funnel.map((step) => t('marketing.analytics.funnelStep', { vars: { stage: stageLabel(step.stage), rate: f.percent(step.conversion) } }))}
                series={[{ label: t('marketing.analytics.reached'), values: funnel.funnel.map((step) => step.reached) }]}
                ariaLabel={funnelTitle}
                testId="funnel-steps"
              />
            </MetricCard>
            <MetricCard title={sourceTitle} help={t('marketing.analytics.sourceHelp')}>
              <BarBreakdownChart
                labels={funnel.by_source.map((row) => labelOf(SOURCE_LABEL, row.key, t))}
                series={[{ label: kpiLabel(t, 'newLeads'), values: funnel.by_source.map((row) => row.count) }]}
                ariaLabel={sourceTitle}
                testId="funnel-sources"
              />
            </MetricCard>
            <MetricCard title={stageTimeTitle} help={t('marketing.analytics.stageTimeHelp')}>
              <BarBreakdownChart
                labels={funnel.time_in_stage.map((row) => stageLabel(row.stage))}
                series={[{ label: t('marketing.analytics.medianHours'), values: funnel.time_in_stage.map((row) => row.median_hours) }]}
                ariaLabel={stageTimeTitle}
                testId="funnel-stage-time"
              />
            </MetricCard>
          </CardGrid>
        </>
      )}
    </AnalyticsLayout>
  );
}
