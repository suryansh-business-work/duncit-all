import { useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import AnalyticsLayout, { CardGrid, KpiGrid, MetricCard } from '../analytics-shared/AnalyticsLayout';
import { useAnalyticsWindow } from '../analytics-shared/useAnalyticsWindow';
import { dayLabels, labelOf, useFigures } from '../analytics-shared/format';
import { introSteps, kpi, kpiLabel } from '../analytics-shared/copy';
import { MARKETING_ANALYTICS_AUTOMATION, type AnalyticsAutomation } from '../analytics-shared/queries';
import LineTrendChart from '../social-accounts-page/analytics/LineTrendChart';
import BarBreakdownChart from '../social-accounts-page/analytics/BarBreakdownChart';
import { STATUS_LABEL, WORKFLOW_LABEL } from '../activity-page/copy';
import { AGENT_NAME } from '../agents-page/copy';

/** Marketing › Analytics › Automation: runs, outcomes, AI cost, approvals and agents. */
export default function AnalyticsAutomationPage() {
  const { t } = useTranslation();
  const f = useFigures();
  const range = useAnalyticsWindow();
  const { data, error } = useQuery<{ marketingAnalyticsAutomation: AnalyticsAutomation }>(MARKETING_ANALYTICS_AUTOMATION, {
    variables: { input: { from: range.input.from, to: range.input.to } },
  });
  const automation = data?.marketingAnalyticsAutomation;
  const trendTitle = t('marketing.analytics.runsTrendTitle');
  const costTitle = t('marketing.analytics.costTitle');
  const statusTitle = t('marketing.analytics.statusTitle');
  const agentsTitle = t('marketing.analytics.agentsTitle');
  // Only what ran: eleven empty workflow bars would bury the two that did.
  const workflows = automation?.by_workflow.filter((row) => row.runs > 0) ?? [];
  const statuses = automation?.by_status.filter((row) => row.count > 0) ?? [];

  return (
    <AnalyticsLayout
      id="automation"
      title={t('marketing.analytics.automationTitle')}
      summary={t('marketing.analytics.automationSummary')}
      steps={introSteps(t)}
      range={range}
      showPlatforms={false}
      error={error}
      ready={Boolean(automation)}
      empty={automation ? automation.runs === 0 && automation.approvals.waiting === 0 : false}
    >
      {automation && (
        <>
          <KpiGrid
            tiles={[
              kpi(t, 'runs', f.count(automation.runs)),
              kpi(t, 'successRate', f.percent(automation.success_rate)),
              kpi(t, 'aiCost', f.usd(automation.cost)),
              kpi(t, 'tokens', f.count(automation.tokens)),
              kpi(t, 'approvalsWaiting', f.count(automation.approvals.waiting)),
              kpi(t, 'decisionTime', t('marketing.analytics.minutes', { vars: { count: f.count(automation.approvals.median_decision_minutes) } })),
            ]}
          />
          <MetricCard title={trendTitle} help={t('marketing.analytics.runsTrendHelp')}>
            <LineTrendChart
              labels={dayLabels(automation.window.days)}
              series={[
                { label: kpiLabel(t, 'runs'), values: automation.daily.runs },
                { label: kpiLabel(t, 'aiCost'), values: automation.daily.cost },
              ]}
              ariaLabel={trendTitle}
              testId="automation-trend"
            />
          </MetricCard>
          <CardGrid>
            <MetricCard title={costTitle} help={t('marketing.analytics.costHelp')}>
              <BarBreakdownChart
                labels={workflows.map((row) => labelOf(WORKFLOW_LABEL, row.workflow, t))}
                series={[
                  { label: kpiLabel(t, 'runs'), values: workflows.map((row) => row.runs) },
                  { label: kpiLabel(t, 'aiCost'), values: workflows.map((row) => row.cost) },
                ]}
                ariaLabel={costTitle}
                testId="automation-workflows"
              />
            </MetricCard>
            <MetricCard title={statusTitle} help={t('marketing.analytics.statusHelp')}>
              <BarBreakdownChart
                labels={statuses.map((row) => labelOf(STATUS_LABEL, row.key, t))}
                series={[{ label: kpiLabel(t, 'runs'), values: statuses.map((row) => row.count) }]}
                ariaLabel={statusTitle}
                testId="automation-statuses"
              />
            </MetricCard>
            <MetricCard title={agentsTitle} help={t('marketing.analytics.agentsHelp')}>
              <BarBreakdownChart
                labels={automation.agents.map((row) => labelOf(AGENT_NAME, row.agent_key, t))}
                series={[{ label: kpiLabel(t, 'runs'), values: automation.agents.map((row) => row.runs) }]}
                ariaLabel={agentsTitle}
                testId="automation-agents"
              />
            </MetricCard>
          </CardGrid>
        </>
      )}
    </AnalyticsLayout>
  );
}
