import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AuditLogsPage from '../../src/pages/audit/AuditLogsPage';
import MappingDialog from '../../src/pages/mapping/MappingDialog';
import MappingPage from '../../src/pages/mapping/MappingPage';
import NotificationsPage from '../../src/pages/notifications/NotificationsPage';
import PodChallengesPage from '../../src/pages/pod-challenges/PodChallengesPage';
import { renderWithProviders } from '../testkit';
import { makeTool } from '../mocks';
import { __setTableRows } from './table-mock';

const m = vi.hoisted(() => ({
  queries: {} as Record<string, { data?: unknown; loading?: boolean; error?: Error; refetch?: ReturnType<typeof vi.fn> }>,
  fetchArgs: [] as unknown[][],
  fetchCalls: 0,
}));

vi.mock('@duncit/table', async () => {
  const mock = await import('./table-mock');
  return {
    ...mock,
    useApolloTableFetch: (...args: unknown[]) => {
      m.fetchArgs.push(args);
      const fetchRows = mock.useApolloTableFetch();
      return () => {
        m.fetchCalls += 1;
        return fetchRows();
      };
    },
  };
});
vi.mock('@apollo/client/react', async (io) => ({
  ...(await io<typeof import('@apollo/client/react')>()),
  useQuery: (doc: { definitions: { name: { value: string } }[] }) => {
    const state = m.queries[doc.definitions[0].name.value] ?? {};
    return { data: undefined, loading: false, error: undefined, refetch: vi.fn().mockResolvedValue({}), ...state };
  },
}));
vi.mock('@duncit/category', () => ({
  AdminCategorySelect: ({ onChange, hint }: { onChange: (v: Record<string, string>) => void; hint: string }) => (
    <div>
      <span>{hint}</span>
      <button
        type="button"
        onClick={() =>
          onChange({ super_id: 's', super_name: 'S', category_id: 'c', category_name: 'C', sub_id: 'sub-9', sub_name: 'Sub' })
        }
      >
        pick-sub
      </button>
    </div>
  ),
}));
vi.mock('@duncit/challenges', async (io) => ({
  ...(await io<typeof import('@duncit/challenges')>()),
  ChallengeMappingEditor: ({ categoryId, onSaved }: { categoryId: string; onSaved: () => void }) => (
    <div>
      <span data-testid="editor-category">{categoryId}</span>
      <button type="button" onClick={onSaved}>
        editor-saved
      </button>
    </div>
  ),
}));

beforeEach(() => {
  m.queries = {};
  m.fetchArgs = [];
  m.fetchCalls = 0;
  __setTableRows([]);
});

describe('NotificationsPage', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 'n1',
    challenge_id: 'c1',
    challenge_name: 'Sprint',
    pod_title: 'Sunday Run',
    kind: 'RESULT',
    version: 1,
    recipients: 12,
    whatsapp: 10,
    email: 2,
    last_sent_at: '2026-10-05T09:00:00.000Z',
    ...over,
  });

  it('shows a progress bar while loading', () => {
    m.queries.ChallengeNotifications = { loading: true };
    render(<NotificationsPage />);
    expect(screen.getByRole('progressbar', { name: 'Loading notifications…' })).toBeInTheDocument();
  });

  it('shows the error when nothing could be loaded', () => {
    m.queries.ChallengeNotifications = { error: new Error('down') };
    render(<NotificationsPage />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByTestId('duncit-table')).not.toBeInTheDocument();
  });

  it('lists notices with the kind named, and searches by challenge or pod', async () => {
    m.queries.ChallengeNotifications = {
      data: { challengeNotifications: [row(), row({ id: 'n2', kind: 'LIVE', challenge_name: 'Relay' })] },
    };
    render(<NotificationsPage />);
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByTestId('cell-kind')).toHaveTextContent('Result published');
    expect(within(rows[1]).getByTestId('cell-kind')).toHaveTextContent('Challenge started');
    expect(within(rows[0]).getByTestId('cell-last_sent_at')).toHaveTextContent('2026-10-05');
  });

  it('keeps the table when a refresh fails but rows are cached', async () => {
    m.queries.ChallengeNotifications = { data: { challengeNotifications: [] }, error: new Error('stale') };
    render(<NotificationsPage />);
    expect(await screen.findByTestId('duncit-table')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('AuditLogsPage', () => {
  const audit = (over: Record<string, unknown> = {}) => ({
    id: 'a1',
    challenge_id: 'c1',
    challenge_name: 'Sprint',
    action: 'SCORE_CORRECTED',
    actor_name: 'Asha',
    reason: 'Typo',
    old_value_json: '{"score":3}',
    new_value_json: '{"score":5}',
    created_at: '2026-10-05T09:00:00.000Z',
    ...over,
  });

  it('shows before → after for a change and falls back to dashes', async () => {
    __setTableRows([
      audit(),
      audit({ id: 'a2', old_value_json: 'null', new_value_json: '{"status":"LIVE"}', actor_name: '', reason: '' }),
      audit({ id: 'a3', old_value_json: '{"status":"LIVE"}', new_value_json: '{}' }),
      audit({ id: 'a4', old_value_json: '', new_value_json: 'null' }),
    ]);
    renderWithProviders(<AuditLogsPage />);
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByTestId('cell-new_value_json')).toHaveTextContent('{"score":3} → {"score":5}');
    expect(within(rows[0]).getByTestId('cell-actor_name')).toHaveTextContent('Asha');
    expect(within(rows[1]).getByTestId('cell-new_value_json')).toHaveTextContent('{"status":"LIVE"}');
    expect(within(rows[1]).getByTestId('cell-actor_name')).toHaveTextContent('—');
    expect(within(rows[1]).getByTestId('cell-reason')).toHaveTextContent('—');
    expect(within(rows[2]).getByTestId('cell-new_value_json')).toHaveTextContent('{"status":"LIVE"}');
    expect(within(rows[3]).getByTestId('cell-new_value_json')).toHaveTextContent('—');
  });

  it('shows the empty state', async () => {
    renderWithProviders(<AuditLogsPage />);
    expect(await screen.findByText(/No audit/i)).toBeInTheDocument();
  });
});

describe('PodChallengesPage', () => {
  const challenge = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: 'Sprint',
    pod_title: 'Sunday Run',
    status: 'LIVE',
    enabled: true,
    competitor_count: 4,
    winners: 'Asha',
    started_at: '2026-10-05T09:00:00.000Z',
    updated_at: '2026-10-05T10:00:00.000Z',
    live_url: 'https://arena.example/p1',
    ...over,
  });

  it.each([
    ['all', 'Pod challenges', null],
    ['live', 'Live', ['LIVE', 'PAUSED']],
    ['results', 'Results', ['COMPLETED', 'ARCHIVED']],
  ] as const)('%s view fetches the right statuses', (view, title, statuses) => {
    renderWithProviders(<PodChallengesPage view={view} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(new RegExp(title, 'i'));
    const options = m.fetchArgs[0][3] as { extraVariables: { statuses: string[] | null } };
    expect(options.extraVariables.statuses).toEqual(statuses);
    expect(m.fetchArgs[0][2]).toBe('podChallengesTable');
  });

  it('names each status and links to the arena', async () => {
    __setTableRows([challenge(), challenge({ id: 'p2', status: 'MYSTERY', winners: '', name: 'Relay' })]);
    renderWithProviders(<PodChallengesPage view="all" />);
    const rows = await screen.findAllByTestId('table-row');
    expect(within(rows[0]).getByTestId('cell-status')).toHaveTextContent('Live');
    // An unknown status shows as written.
    expect(within(rows[1]).getByTestId('cell-status')).toHaveTextContent('MYSTERY');
    expect(within(rows[0]).getByTestId('cell-winners')).toHaveTextContent('Asha');
    expect(within(rows[1]).getByTestId('cell-winners')).toHaveTextContent('—');
    const link = within(rows[0]).getByRole('link');
    expect(link).toHaveAttribute('href', 'https://arena.example/p1');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveAccessibleName(/Sprint/);
  });

  describe('live monitor refresh', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('re-reads every ten seconds on the live view and stops on unmount', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      const view = renderWithProviders(<PodChallengesPage view="live" />);
      await waitFor(() => expect(m.fetchCalls).toBe(1));
      act(() => {
        vi.advanceTimersByTime(9_999);
      });
      expect(m.fetchCalls).toBe(1);
      act(() => {
        vi.advanceTimersByTime(1);
      });
      await waitFor(() => expect(m.fetchCalls).toBe(2));
      view.unmount();
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(m.fetchCalls).toBe(2);
    });

    it('does not poll on the all view', async () => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
      renderWithProviders(<PodChallengesPage view="all" />);
      await waitFor(() => expect(m.fetchCalls).toBe(1));
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(m.fetchCalls).toBe(1);
    });
  });
});

describe('MappingDialog', () => {
  it('edits a known sub-category straight away', () => {
    render(<MappingDialog open categoryId="sub-1" categoryLabel="Sports › Cricket › Box" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Sports › Cricket › Box')).toBeInTheDocument();
    expect(screen.getByTestId('editor-category')).toHaveTextContent('sub-1');
    expect(screen.queryByText('pick-sub')).not.toBeInTheDocument();
  });

  it('asks the admin to pick a sub-category first, then edits it', () => {
    render(<MappingDialog open categoryId={null} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.getByText('Pick a sub-category to see its challenge settings.')).toBeInTheDocument();
    expect(screen.queryByTestId('editor-category')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pick-sub' }));
    expect(screen.getByTestId('editor-category')).toHaveTextContent('sub-9');
  });

  it('forgets the picked sub-category when closed and reports a save', () => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const { rerender } = render(<MappingDialog open categoryId={null} onClose={onClose} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole('button', { name: 'pick-sub' }));
    fireEvent.click(screen.getByRole('button', { name: 'editor-saved' }));
    expect(onSaved).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<MappingDialog open categoryId={null} onClose={onClose} onSaved={onSaved} />);
    expect(screen.queryByTestId('editor-category')).not.toBeInTheDocument();
  });

  it('is not rendered while closed', () => {
    render(<MappingDialog open={false} categoryId="sub-1" onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MappingPage', () => {
  const mapping = (over: Record<string, unknown> = {}) => ({
    id: 'm1',
    category_id: 'sub1',
    category_name: 'Box cricket',
    level: 'SUB',
    enabled: true,
    allowed_tool_ids: ['tool-1', 'gone'],
    default_template_id: null,
    updated_at: '2026-10-05T09:00:00.000Z',
    ...over,
  });
  const tree = [
    { id: 'cat1', name: 'Cricket', level: 'CATEGORY', parent_id: null },
    { id: 'sub1', name: 'Box cricket', level: 'SUB', parent_id: 'cat1' },
  ];
  let mappingsRefetch: ReturnType<typeof vi.fn>;

  const setData = (mappings = [mapping()]) => {
    mappingsRefetch = vi.fn().mockResolvedValue({});
    m.queries = {
      ChallengeCategoryMappings: { data: { challengeCategoryMappings: mappings }, refetch: mappingsRefetch },
      ChallengeTools: { data: { challengeTools: [makeTool({ id: 'tool-1', name: 'Score Counter' })] } },
      CategoryTreeNodes: { data: { categories: tree } },
    };
  };

  it('shows a progress bar and then an error when the mappings fail', () => {
    m.queries.ChallengeCategoryMappings = { loading: true };
    const { unmount } = render(<MappingPage />);
    expect(screen.getByRole('progressbar', { name: 'Loading challenge settings…' })).toBeInTheDocument();
    unmount();
    m.queries.ChallengeCategoryMappings = { error: new Error('down') };
    render(<MappingPage />);
    expect(screen.getByText('Challenge settings could not be loaded. Refresh to try again.')).toBeInTheDocument();
  });

  it('lists one row per mapping, including categories missing from the tree', async () => {
    setData([mapping(), mapping({ id: 'm2', category_id: 'zzz', category_name: 'Unknown cat', allowed_tool_ids: [] })]);
    render(<MappingPage />);
    const rows = await screen.findAllByTestId('table-row');
    expect(rows).toHaveLength(2);
  });

  it('opens the editor for a row with its label and refreshes after a save', async () => {
    setData();
    render(<MappingPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit challenge settings' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Cricket › Box cricket')).toBeInTheDocument();
    expect(within(dialog).getByTestId('editor-category')).toHaveTextContent('sub1');
    fireEvent.click(within(dialog).getByRole('button', { name: 'editor-saved' }));
    await waitFor(() => expect(mappingsRefetch).toHaveBeenCalledTimes(1));
  });

  it('closes the editor without refreshing', async () => {
    setData();
    render(<MappingPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit challenge settings' }));
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mappingsRefetch).not.toHaveBeenCalled();
  });

  it('opens an empty picker from the toolbar', async () => {
    setData();
    render(<MappingPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Configure a sub-category' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Pick a sub-category to see its challenge settings.')).toBeInTheDocument();
  });

  it('still lists mappings when the tool list is empty', async () => {
    setData();
    m.queries.ChallengeTools = { loading: true };
    render(<MappingPage />);
    expect(await screen.findAllByTestId('table-row')).toHaveLength(1);
  });
});
