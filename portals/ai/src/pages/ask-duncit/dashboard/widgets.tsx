import { StatCard } from '@duncit/ui';
import type { DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import ForumIcon from '@mui/icons-material/Forum';
import PeopleIcon from '@mui/icons-material/People';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import SpeedIcon from '@mui/icons-material/Speed';
import TokenIcon from '@mui/icons-material/Token';
import PaymentsIcon from '@mui/icons-material/Payments';
import BuildIcon from '@mui/icons-material/Build';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import GppMaybeIcon from '@mui/icons-material/GppMaybe';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import TrendChart from '../../../components/charts/TrendChart';
import { rankWidget } from '../../../components/charts/rankWidget';
import { rankBy } from '../../../components/charts/ranking';
import { millis, percent, trendSummary } from '../../../components/charts/summaries';
import { tokens, usd } from '../../../lib/usd';

type Translate = ReturnType<typeof useTranslation>['t'];

export interface AskDuncitDashboard {
  days: number;
  conversations: number;
  active_users: number;
  messages: number;
  resolution_rate: number;
  avg_response_ms: number;
  avg_first_token_ms: number;
  avg_confidence: number;
  total_tokens: number;
  cost_usd: number;
  tool_calls: number;
  failed_actions: number;
  errors: number;
  handovers: number;
  out_of_context: number;
  violations: number;
  thumbs_up: number;
  thumbs_down: number;
  satisfaction: number;
  daily: Array<{ date: string; messages: number; violations: number; failed_actions: number; users: number }>;
  role_usage: Array<{ role_key: string; messages: number; users: number }>;
  top_tools: Array<{ tool: string; calls: number; failures: number }>;
  violation_kinds: Array<{ kind: string; count: number }>;
}

const tile = (id: string, index: number, content: DashboardWidget['content']): DashboardWidget => ({
  id,
  bare: true,
  defaultLayout: { x: (index % 6) * 2, y: Math.floor(index / 6) * 2, w: 2, h: 2 },
  minW: 2,
  minH: 2,
  content,
});

/** The headline tiles: usage, quality, speed, money, safety. */
function kpis(d: AskDuncitDashboard, t: Translate): DashboardWidget[] {
  const pct = percent(t);
  const ms = millis(t);
  const stat = (label: string, value: string, icon: DashboardWidget['content'], hint?: string) => <StatCard sx={{ height: '100%' }} icon={icon} label={label} value={value} hint={hint} />;
  return [
    stat(t('ai.askDuncit.kpi.conversations'), tokens(d.conversations), <ForumIcon fontSize="small" />, t('ai.askDuncit.kpi.messagesHint', { vars: { count: tokens(d.messages) } })),
    stat(t('ai.askDuncit.kpi.activeUsers'), tokens(d.active_users), <PeopleIcon fontSize="small" />),
    stat(t('ai.askDuncit.kpi.resolution'), pct(Math.round(d.resolution_rate * 100)), <TaskAltIcon fontSize="small" />, t('ai.askDuncit.kpi.confidenceHint', { vars: { value: Math.round(d.avg_confidence * 100) } })),
    stat(t('ai.askDuncit.kpi.response'), ms(d.avg_response_ms), <SpeedIcon fontSize="small" />, t('ai.askDuncit.kpi.firstTokenHint', { vars: { ms: Math.round(d.avg_first_token_ms) } })),
    stat(t('ai.askDuncit.kpi.tokens'), tokens(d.total_tokens), <TokenIcon fontSize="small" />),
    stat(t('ai.askDuncit.kpi.cost'), usd(d.cost_usd), <PaymentsIcon fontSize="small" />),
    stat(t('ai.askDuncit.kpi.toolCalls'), tokens(d.tool_calls), <BuildIcon fontSize="small" />),
    stat(t('ai.askDuncit.kpi.failedActions'), tokens(d.failed_actions), <ErrorOutlineIcon fontSize="small" />, t('ai.askDuncit.kpi.errorsHint', { vars: { count: d.errors } })),
    stat(t('ai.askDuncit.kpi.satisfaction'), pct(Math.round(d.satisfaction * 100)), <ThumbUpAltIcon fontSize="small" />, t('ai.askDuncit.kpi.thumbsHint', { vars: { up: d.thumbs_up, down: d.thumbs_down } })),
    stat(t('ai.askDuncit.kpi.violations'), tokens(d.violations), <GppMaybeIcon fontSize="small" />),
    stat(t('ai.askDuncit.kpi.outOfContext'), tokens(d.out_of_context), <HelpCenterIcon fontSize="small" />),
    stat(t('ai.askDuncit.kpi.handovers'), tokens(d.handovers), <SupportAgentIcon fontSize="small" />),
  ].map((content, index) => tile(`kpi-${index}`, index, content));
}

export function buildDashboardWidgets(d: AskDuncitDashboard, t: Translate, formatDay: (day: string) => string): DashboardWidget[] {
  const days = d.daily.map((day) => day.date);
  const title = t('ai.askDuncit.dailyActivity');
  const none = t('ai.askDuncit.noData');
  return [
    ...kpis(d, t),
    {
      id: 'daily',
      title,
      defaultLayout: { x: 0, y: 4, w: 12, h: 6 },
      minW: 4,
      minH: 4,
      content: (
        <TrendChart
          type="bar"
          days={days}
          series={[
            { label: t('ai.askDuncit.series.messages'), data: d.daily.map((day) => day.messages) },
            { label: t('ai.askDuncit.series.violations'), data: d.daily.map((day) => day.violations) },
            { label: t('ai.askDuncit.series.failedActions'), data: d.daily.map((day) => day.failed_actions) },
          ]}
          format={tokens}
          summary={trendSummary(t, title, days, tokens(d.messages), formatDay)}
        />
      ),
    },
    rankWidget(t, { id: 'roles', title: t('ai.askDuncit.byRole'), ranking: rankBy(d.role_usage, (r) => r.role_key, (r) => r.messages), seriesLabel: t('ai.askDuncit.series.messages'), format: tokens, emptyText: none, layout: { x: 0, y: 10, w: 4, h: 6 } }),
    rankWidget(t, { id: 'tools', title: t('ai.askDuncit.topTools'), ranking: rankBy(d.top_tools, (r) => r.tool, (r) => r.calls), seriesLabel: t('ai.askDuncit.series.calls'), format: tokens, emptyText: none, layout: { x: 4, y: 10, w: 4, h: 6 } }),
    rankWidget(t, { id: 'violations', title: t('ai.askDuncit.byViolation'), ranking: rankBy(d.violation_kinds, (r) => r.kind, (r) => r.count), seriesLabel: t('ai.askDuncit.series.violations'), format: tokens, emptyText: none, layout: { x: 8, y: 10, w: 4, h: 6 } }),
  ];
}
