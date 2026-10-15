import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, useLocation } from 'react-router';
import { notifySuccess } from '@duncit/dialogs';
import AiFeatureDetailPage from '../../src/pages/ai-features/detail';
import { AI_FEATURE_ONE, SET_AI_FEATURE_ENABLED, type AiFeature } from '../../src/pages/ai-features/queries';
import { OPENAI_LOGS_TABLE, type OpenAiLogRow } from '../../src/pages/openai-logs/queries';
import { renderWithProviders } from '../testkit';
import { answerQuery, mutationOf, queryOptions, resetApollo } from './reel-apollo-mock';

const { confirm, fetchLogs, useApolloTableFetch } = vi.hoisted(() => {
  const fetchLogs = vi.fn();
  return {
    confirm: vi.fn(),
    fetchLogs,
    useApolloTableFetch: vi.fn((..._args: unknown[]) => fetchLogs),
  };
});

vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  ...(await import('./reel-apollo-mock')).hooks,
}));

vi.mock('@duncit/dialogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@duncit/dialogs')>()),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  useConfirm: () => confirm,
}));

vi.mock('@duncit/table', async () => ({
  ...(await import('./table-mock')),
  dateColumn: (options: object) => options,
  useApolloTableFetch,
}));

// The drawer has its own suite; here it only has to open on the row clicked.
vi.mock('../../src/pages/openai-logs/OpenAiLogDrawer', () => ({
  default: ({ logId, onClose }: { logId: string | null; onClose: () => void }) =>
    logId ? (
      <div data-testid="log-drawer">
        {logId}
        <button type="button" onClick={onClose}>
          close drawer
        </button>
      </div>
    ) : null,
}));

/**
 * One AI feature's page — its switch, its usage over the range, and every call
 * it made. The calls are the OpenAI Logs table pinned to this feature's task
 * key, so the page must never show another feature's rows.
 */
const feature = (over: Partial<AiFeature> = {}): AiFeature => ({
  key: 'moderation.scan',
  label: 'Moderation scan',
  module: 'Safety',
  description: 'Scans every upload for unsafe content',
  when_off: 'Rule-based checks only',
  enabled: true,
  updated_by_name: 'Asha Rao',
  updated_at: '2026-10-14T10:00:00.000Z',
  range_days: 30,
  calls: 1204,
  failed_calls: 3,
  skipped_calls: 2,
  prompt_tokens: 12_000,
  completion_tokens: 3_400,
  total_tokens: 15_400,
  cost_usd: 1.24,
  avg_duration_ms: 1420,
  unpriced_calls: 0,
  last_called_at: '2026-10-14T10:00:00.000Z',
  ...over,
});

const logRow = (over: Partial<OpenAiLogRow> = {}): OpenAiLogRow => ({
  id: 'log-1',
  task: 'moderation.scan',
  task_label: 'Moderation scan',
  module: 'Safety',
  detail: 'upload 42',
  model: 'gpt-4o-mini',
  status: 'SUCCESS',
  http_status: 200,
  prompt_tokens: 100,
  completion_tokens: 20,
  total_tokens: 120,
  cost_usd: 0.0002,
  priced: true,
  duration_ms: 900,
  error_message: '',
  created_at: '2026-10-14T10:00:00.000Z',
  ...over,
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const mount = (path = '/ai-features/moderation.scan') =>
  renderWithProviders(<AiFeatureDetailPage />, {
    initialEntries: [path],
    routes: (
      <>
        <Route path="/ai-features/:key" element={<AiFeatureDetailPage />} />
        {/* A mount with no key in the path at all. */}
        <Route path="/no-key" element={<AiFeatureDetailPage />} />
        <Route path="/ai-features" element={<LocationProbe />} />
      </>
    ),
  });

beforeEach(() => {
  resetApollo();
  confirm.mockReset();
  vi.mocked(notifySuccess).mockClear();
  useApolloTableFetch.mockClear();
  fetchLogs.mockReset();
  fetchLogs.mockResolvedValue({ rows: [logRow()], total: 1 });
});

describe('AiFeatureDetailPage — summary', () => {
  it('asks for the feature named in the path over the range in the URL', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount('/ai-features/moderation.scan?days=7');

    expect(queryOptions.get(AI_FEATURE_ONE)).toMatchObject({
      variables: { key: 'moderation.scan', range_days: 7 },
      skip: false,
    });
  });

  it('shows what the feature is, its switch and its usage', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount();

    expect(screen.getByRole('heading', { level: 1, name: 'Moderation scan' })).toBeInTheDocument();
    expect(screen.getByText('moderation.scan · Safety')).toBeInTheDocument();
    expect(screen.getByText('Scans every upload for unsafe content')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch Moderation scan on or off')).toBeChecked();
    expect(screen.getByText('1,204')).toBeInTheDocument();
    expect(screen.getByText('3 failed · 2 skipped')).toBeInTheDocument();
    expect(screen.getByText('12,000')).toBeInTheDocument();
    expect(screen.getByText('3,400')).toBeInTheDocument();
    expect(screen.getByText('$1.24')).toBeInTheDocument();
    expect(screen.getByText('1420 ms')).toBeInTheDocument();
  });

  it('says what happens when it is off, and who last switched it', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount();

    expect(screen.getByText('When switched off: Rule-based checks only')).toBeInTheDocument();
    expect(screen.getByText(/^Last switched by Asha Rao on /)).toBeInTheDocument();
  });

  it('names an unknown switcher generically rather than leaving a blank', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature({ updated_by_name: null }) } });
    mount();

    expect(screen.getByText(/^Last switched by an admin on /)).toBeInTheDocument();
  });

  it('says nothing about who switched it when it was never switched', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature({ updated_at: null }) } });
    mount();

    expect(screen.queryByText(/Last switched by/)).not.toBeInTheDocument();
  });

  it('warns rather than informs while the feature is off', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature({ enabled: false }) } });
    mount();

    const alert = screen.getByText('When switched off: Rule-based checks only').closest('[role="alert"]');
    expect(alert?.className).toMatch(/Warning/i);
    expect(screen.getByText('Off')).toBeInTheDocument();
  });

  it('calls the cost a minimum when some calls used an unrated model', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature({ unpriced_calls: 4 }) } });
    mount();

    expect(
      screen.getByText('4 call(s) used a model with no rate card entry — the cost shown is a minimum.')
    ).toBeInTheDocument();
  });

  it('shows no pricing note when every call was priced', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount();

    expect(screen.queryByText(/no rate card entry/)).not.toBeInTheDocument();
  });

  it('shows a spinner while the feature is loading', () => {
    answerQuery(AI_FEATURE_ONE, { loading: true });
    mount();

    expect(screen.getByTestId('loader')).toHaveAttribute('role', 'status');
    // The calls table does not wait on the summary.
    expect(screen.getByTestId('duncit-table')).toBeInTheDocument();
  });

  it('says the load failed when there is no feature to show', () => {
    answerQuery(AI_FEATURE_ONE, { error: new Error('boom') });
    mount();

    expect(screen.getByText('Could not load the AI features. Try again.')).toBeInTheDocument();
  });

  it('keeps the feature on screen when a background refresh fails', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() }, error: new Error('boom') });
    mount();

    expect(screen.getByRole('heading', { level: 1, name: 'Moderation scan' })).toBeInTheDocument();
    expect(screen.queryByText('Could not load the AI features. Try again.')).not.toBeInTheDocument();
  });

  it('skips the query and pins the logs to nothing when the path names no feature', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount('/no-key');

    expect(queryOptions.get(AI_FEATURE_ONE)).toMatchObject({ variables: { key: '', range_days: 30 }, skip: true });
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
  });
});

describe('AiFeatureDetailPage — calls', () => {
  it('pins the OpenAI logs query to this feature’s task key', () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount();

    expect(useApolloTableFetch).toHaveBeenCalledWith(
      expect.anything(),
      OPENAI_LOGS_TABLE,
      'openAiUsageLogsTable',
      { extraVariables: { task: 'moderation.scan' } },
      ['moderation.scan']
    );
  });

  it('lists the feature’s calls and opens one in the drawer, then closes it', async () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount();

    expect(screen.getByRole('heading', { level: 2, name: 'Calls' })).toBeInTheDocument();
    fireEvent.click(await screen.findByTestId('table-row'));
    expect(screen.getByTestId('log-drawer')).toHaveTextContent('log-1');

    fireEvent.click(screen.getByText('close drawer'));
    expect(screen.queryByTestId('log-drawer')).not.toBeInTheDocument();
  });

  it('goes back to the list on the same range', async () => {
    answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    mount('/ai-features/moderation.scan?days=90');

    fireEvent.click(screen.getByRole('button', { name: 'All AI features' }));

    expect(await screen.findByTestId('location')).toHaveTextContent('/ai-features?days=90');
  });

  it('reloads both the summary and the calls after a switch is saved', async () => {
    const refetch = answerQuery(AI_FEATURE_ONE, { data: { aiFeature: feature() } });
    confirm.mockResolvedValue(true);
    mount();

    await screen.findByTestId('table-row');
    const loadsBefore = fetchLogs.mock.calls.length;
    fireEvent.click(screen.getByLabelText('Switch Moderation scan on or off'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Moderation scan switched off'));
    expect(mutationOf(SET_AI_FEATURE_ENABLED)).toHaveBeenCalledWith({
      variables: { key: 'moderation.scan', enabled: false },
    });
    expect(refetch).toHaveBeenCalled();
    expect(fetchLogs.mock.calls.length).toBeGreaterThan(loadsBefore);
  });

  it('still reloads the calls when the summary refetch fails', async () => {
    answerQuery(AI_FEATURE_ONE, {
      data: { aiFeature: feature({ enabled: false }) },
      refetch: vi.fn(() => Promise.reject(new Error('offline'))),
    });
    mount();

    await screen.findByTestId('table-row');
    const loadsBefore = fetchLogs.mock.calls.length;
    fireEvent.click(screen.getByLabelText('Switch Moderation scan on or off'));

    await waitFor(() => expect(notifySuccess).toHaveBeenCalledWith('Moderation scan switched on'));
    expect(fetchLogs.mock.calls.length).toBeGreaterThan(loadsBefore);
  });
});

describe('OPENAI_LOGS_TABLE', () => {
  it('takes an optional task and hands it to the table resolver', () => {
    const [operation] = OPENAI_LOGS_TABLE.definitions;
    if (operation.kind !== 'OperationDefinition') throw new Error('expected an operation');

    const task = operation.variableDefinitions?.find((v) => v.variable.name.value === 'task');
    // Optional, so the OpenAI Logs page (which pins nothing) keeps working.
    expect(task?.type).toMatchObject({ kind: 'NamedType', name: { value: 'String' } });

    const [field] = operation.selectionSet.selections;
    if (field.kind !== 'Field') throw new Error('expected a field');
    expect(field.name.value).toBe('openAiUsageLogsTable');
    expect(field.arguments?.map((a) => [a.name.value, a.value.kind === 'Variable' && a.value.name.value])).toEqual([
      ['query', 'query'],
      ['task', 'task'],
    ]);
  });
});
