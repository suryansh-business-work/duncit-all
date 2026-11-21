import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import AiLibraryDashboardPage from '../../src/pages/library-dashboard';
import PromptLinks from '../../src/pages/library-dashboard/PromptLinks';
import { recentPrompts } from '../../src/pages/library-dashboard/widgets';
import { AI_LIBRARY_DASHBOARD, type LibraryDashboard, type LibraryPromptStat } from '../../src/pages/library-dashboard/queries';
import { renderWithProviders } from '../testkit';
import { answerQuery, queryOptions, resetApollo } from '../hooks-mock';

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('../hooks-mock')).hooks,
}));

vi.mock('@duncit/dashboard', () => ({
  DuncitDashboard: ({ header, widgets }: { header: ReactNode; widgets: { id: string; title?: string; subtitle?: string; content: ReactNode }[] }) => (
    <div data-testid="dashboard">
      {header}
      {widgets.map((widget) => (
        <section key={widget.id} data-testid={`widget-${widget.id}`}>
          {widget.subtitle && <p>{widget.subtitle}</p>}
          {widget.content}
        </section>
      ))}
    </div>
  ),
}));

vi.mock('react-chartjs-2', () => ({
  Bar: (props: { 'aria-label': string; data: { labels: string[]; datasets: { data: number[] }[] } }) => (
    <canvas
      role="img"
      aria-label={props['aria-label']}
      data-labels={props.data.labels.join('|')}
      data-series={props.data.datasets.map((d) => d.data.join(',')).join('/')}
    />
  ),
}));

/**
 * AI Library › Dashboard — what the library holds, how far its code prompts
 * drifted from the code defaults, and how much the features behind each prompt
 * were used.
 *
 * What has to hold: the counts are the server's; category and model charts
 * stack code over AI prompts, an empty model reads "Default model"; usage
 * rankings cover code prompts only (an AI prompt serves no feature); edited and
 * recently updated prompts link to their details in the library, on their own
 * tab; a missing catalogue prompt is called out; a load failure says so.
 */
const stat = (over: Partial<LibraryPromptStat>): LibraryPromptStat => ({
  id: 'p1',
  key: 'moderation.pod',
  kind: 'CODE',
  role: 'SYSTEM',
  name: 'Pod content safety review',
  category: 'Moderation',
  target_model: 'gpt-4o',
  token_count: 300,
  is_active: true,
  matches_default: true,
  updated_at: '2026-11-20T10:00:00.000Z',
  features: ['moderation.pod'],
  calls: 0,
  failed_calls: 0,
  total_tokens: 0,
  cost_usd: 0,
  ...over,
});

const PROMPTS = [
  stat({ calls: 120, cost_usd: 0.9 }),
  stat({ id: 'p2', key: 'moderation.pod.user', role: 'USER', name: 'Pod review turn', token_count: 20, matches_default: false, calls: 120, cost_usd: 0.9, updated_at: '2026-11-21T10:00:00.000Z' }),
  stat({ id: 'p3', key: 'support.assistant', name: 'Support reply', category: 'Support', calls: 7, cost_usd: 2, updated_at: null }),
  stat({ id: 'p4', key: 'weekly-digest', kind: 'AI', name: 'Weekly digest', matches_default: null, features: [], token_count: 900, calls: 0, updated_at: '2026-11-22T09:00:00.000Z' }),
];

const dashboard = (over: Partial<LibraryDashboard> = {}): LibraryDashboard => ({
  range_days: 30,
  code_prompts: 3,
  system_prompts: 2,
  user_prompts: 1,
  ai_prompts: 1,
  active_ai_prompts: 1,
  edited_code_prompts: 1,
  missing_code_prompts: 0,
  features_total: 46,
  features_with_prompt: 44,
  by_category: [
    { key: 'Moderation', code: 2, ai: 1 },
    { key: 'Support', code: 1, ai: 0 },
  ],
  by_model: [
    { key: 'gpt-4o', code: 2, ai: 1 },
    { key: '', code: 1, ai: 0 },
  ],
  prompts: PROMPTS,
  ...over,
});

const attr = (widget: string, name: string) =>
  within(screen.getByTestId(`widget-${widget}`)).getByRole('img').getAttribute(name);

beforeEach(() => resetApollo());

describe('AiLibraryDashboardPage', () => {
  it('asks for the range in the URL and waits for it', () => {
    answerQuery(AI_LIBRARY_DASHBOARD, { loading: true });
    renderWithProviders(<AiLibraryDashboardPage />, { initialEntries: ['/library/dashboard?days=90'] });

    expect(queryOptions.get(AI_LIBRARY_DASHBOARD)?.variables).toEqual({ range_days: 90 });
    expect(screen.getByRole('heading', { name: 'AI Library Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the AI Library' })).toHaveAttribute('href', '/library');
  });

  it('shows only the header while there is no answer yet and nothing failed', () => {
    answerQuery(AI_LIBRARY_DASHBOARD, {});
    renderWithProviders(<AiLibraryDashboardPage />);

    expect(screen.getByRole('heading', { name: 'AI Library Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it('says the load failed when there is nothing to show', () => {
    answerQuery(AI_LIBRARY_DASHBOARD, { error: new Error('boom') });
    renderWithProviders(<AiLibraryDashboardPage />);

    expect(screen.getByText('Could not load the AI Library dashboard. Try again.')).toBeInTheDocument();
  });

  it('shows the counts, the stacked breakdowns, the usage rankings and the prompt lists', () => {
    answerQuery(AI_LIBRARY_DASHBOARD, { data: { aiLibraryDashboard: dashboard() } });
    renderWithProviders(<AiLibraryDashboardPage />);

    expect(screen.getByText('2 system · 1 user turns')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('44 of 46')).toBeInTheDocument();
    expect(screen.getByText('Calls of the AI features each prompt serves, over the range.')).toBeInTheDocument();
    // Code over AI, per category; the configured default model has a name.
    expect(attr('by-category', 'data-series')).toBe('2,1/1,0');
    expect(attr('by-model', 'data-labels')).toBe('gpt-4o|Default model');
    // An AI prompt serves no feature, so it never ranks by usage — but it is a prompt with a size.
    expect(attr('top-calls', 'data-labels')).toBe('Pod content safety review|Pod review turn|Support reply');
    expect(attr('top-cost', 'data-labels')).toBe('Support reply|Pod content safety review|Pod review turn');
    expect(attr('largest', 'data-labels')).toBe('Weekly digest|Pod content safety review|Support reply|Pod review turn');
    // The edited prompt links to its details; the AI prompt opens on the AI tab.
    const edited = within(screen.getByTestId('widget-edited-prompts'));
    expect(edited.getByRole('link', { name: 'Pod review turn' })).toHaveAttribute(
      'href',
      '/library?selectedtab=CODE&prompt=moderation.pod.user'
    );
    const recent = within(screen.getByTestId('widget-recent-prompts'));
    expect(recent.getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Weekly digest',
      'Pod review turn',
      'Pod content safety review',
    ]);
    expect(recent.getByRole('link', { name: 'Weekly digest' })).toHaveAttribute('href', '/library?selectedtab=AI&prompt=weekly-digest');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('calls out catalogue prompts the library has not added yet', () => {
    answerQuery(AI_LIBRARY_DASHBOARD, { data: { aiLibraryDashboard: dashboard({ missing_code_prompts: 2 }) } });
    renderWithProviders(<AiLibraryDashboardPage />);

    expect(screen.getByRole('alert')).toHaveTextContent('2 code prompt(s) are not in the library yet');
  });

  it('shows empty states for an empty library', () => {
    answerQuery(AI_LIBRARY_DASHBOARD, {
      data: { aiLibraryDashboard: dashboard({ by_category: [], by_model: [], prompts: [], edited_code_prompts: 0 }) },
    });
    renderWithProviders(<AiLibraryDashboardPage />);

    expect(screen.getAllByText('No prompts yet.')).toHaveLength(4);
    expect(screen.getAllByText('No prompt was used in this range.')).toHaveLength(2);
    expect(screen.getByText('Every code prompt matches its code default.')).toBeInTheDocument();
  });
});

describe('PromptLinks', () => {
  it('prints a prompt with no key as plain text, and the update time only when asked', () => {
    renderWithProviders(
      <PromptLinks prompts={[stat({ key: null, name: 'Unsaved draft' }), stat({ id: 'p9', name: 'Never saved', updated_at: null })]} emptyText="none" showUpdated />
    );

    expect(screen.getByText('Unsaved draft').closest('a')).toBeNull();
    expect(screen.getAllByText(/^Updated /)).toHaveLength(1);
  });

  it('leaves the update time out by default', () => {
    renderWithProviders(<PromptLinks prompts={[stat({})]} emptyText="none" />);

    expect(screen.queryByText(/^Updated /)).toBeNull();
  });
});

describe('recentPrompts', () => {
  it('lists the most recently updated first, skips undated rows, and stops at the limit', () => {
    expect(recentPrompts(PROMPTS).map((p) => p.id)).toEqual(['p4', 'p2', 'p1']);
    expect(recentPrompts(PROMPTS, 1).map((p) => p.id)).toEqual(['p4']);
  });
});
