import type { DashboardPosition, DashboardWidget } from '@duncit/dashboard';
import type { useTranslation } from '@duncit/shell';
import RankBars from '../../components/charts/RankBars';
import { rankBy } from '../../components/charts/ranking';
import { rankWidget } from '../../components/charts/rankWidget';
import { rankSummary } from '../../components/charts/summaries';
import { tokens, usd } from '../../lib/usd';
import { libraryKpis } from './kpis';
import PromptLinks from './PromptLinks';
import type { LibraryCount, LibraryDashboard, LibraryPromptStat } from './queries';

type Translate = ReturnType<typeof useTranslation>['t'];

/** How many prompts the "recently updated" list shows. */
const RECENT_N = 8;

/** Most recently updated first; a row with no date (never saved since the field existed) goes last. */
export const recentPrompts = (prompts: readonly LibraryPromptStat[], limit = RECENT_N): LibraryPromptStat[] =>
  prompts
    .filter((prompt) => prompt.updated_at)
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
    .slice(0, limit);

interface CountSpec {
  id: string;
  title: string;
  counts: readonly LibraryCount[];
  label: (count: LibraryCount) => string;
  layout: DashboardPosition;
}

/** Prompts per category or model, code and AI stacked: two parts of one count. */
function countWidget(t: Translate, spec: CountSpec): DashboardWidget {
  const labels = spec.counts.map(spec.label);
  const totals = spec.counts.map((count) => count.code + count.ai);
  return {
    id: spec.id,
    title: spec.title,
    fitContent: true,
    defaultLayout: spec.layout,
    minW: 3,
    minH: 3,
    content: (
      <RankBars
        labels={labels}
        series={[
          { label: t('ai.libraryDashboard.seriesCode'), data: spec.counts.map((count) => count.code) },
          { label: t('ai.libraryDashboard.seriesAi'), data: spec.counts.map((count) => count.ai) },
        ]}
        format={tokens}
        summary={rankSummary(t, spec.title, labels, totals, tokens)}
        emptyText={t('ai.libraryDashboard.noPrompts')}
      />
    ),
  };
}

const listWidget = (id: string, title: string, layout: DashboardPosition, content: DashboardWidget['content']) => ({
  id,
  title,
  fitContent: true,
  defaultLayout: layout,
  minW: 3,
  minH: 2,
  content,
});

/**
 * Every widget of the AI Library dashboard. Usage per prompt is the usage of
 * the AI features it serves (joined through the catalogue on the server), so it
 * matches the AI Features pages exactly.
 */
export function buildLibraryWidgets(d: LibraryDashboard, t: Translate): DashboardWidget[] {
  const code = d.prompts.filter((prompt) => prompt.kind === 'CODE');
  const edited = code.filter((prompt) => prompt.matches_default === false);
  const byName = (prompt: LibraryPromptStat) => prompt.name;
  const noUsage = t('ai.libraryDashboard.noUsage');
  const defaultModel = t('ai.libraryDashboard.defaultModel');
  const topCalls = rankWidget(t, {
    id: 'top-calls',
    title: t('ai.libraryDashboard.topCalls'),
    ranking: rankBy(code, byName, (prompt) => prompt.calls),
    seriesLabel: t('ai.libraryDashboard.seriesCalls'),
    format: tokens,
    emptyText: noUsage,
    layout: { x: 0, y: 8, w: 6, h: 6 },
  });

  return [
    ...libraryKpis(d, t),
    countWidget(t, {
      id: 'by-category',
      title: t('ai.libraryDashboard.byCategory'),
      counts: d.by_category,
      label: (count) => count.key,
      layout: { x: 0, y: 2, w: 6, h: 6 },
    }),
    countWidget(t, {
      id: 'by-model',
      title: t('ai.libraryDashboard.byModel'),
      counts: d.by_model,
      label: (count) => count.key || defaultModel,
      layout: { x: 6, y: 2, w: 6, h: 6 },
    }),
    { ...topCalls, subtitle: t('ai.libraryDashboard.topCallsHint') },
    rankWidget(t, {
      id: 'top-cost',
      title: t('ai.libraryDashboard.topCost'),
      ranking: rankBy(code, byName, (prompt) => prompt.cost_usd),
      seriesLabel: t('ai.libraryDashboard.seriesCost'),
      format: usd,
      emptyText: noUsage,
      layout: { x: 6, y: 8, w: 6, h: 6 },
    }),
    rankWidget(t, {
      id: 'largest',
      title: t('ai.libraryDashboard.largest'),
      ranking: rankBy(d.prompts, byName, (prompt) => prompt.token_count),
      seriesLabel: t('ai.libraryDashboard.seriesTokens'),
      format: tokens,
      emptyText: t('ai.libraryDashboard.noPrompts'),
      layout: { x: 0, y: 14, w: 6, h: 6 },
    }),
    listWidget(
      'edited',
      t('ai.libraryDashboard.edited'),
      { x: 6, y: 14, w: 6, h: 4 },
      <PromptLinks prompts={edited} emptyText={t('ai.libraryDashboard.noneEdited')} />
    ),
    listWidget(
      'recent',
      t('ai.libraryDashboard.recent'),
      { x: 6, y: 18, w: 6, h: 4 },
      <PromptLinks prompts={recentPrompts(d.prompts)} emptyText={t('ai.libraryDashboard.noPrompts')} showUpdated />
    ),
  ];
}
