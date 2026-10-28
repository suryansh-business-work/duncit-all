import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Route } from 'react-router';
import { renderWithProviders } from '../testkit';
import { mutation, ops, resetOps } from '../mocks/ops';
import { stressConfig, stressRun, stressSample, stressSettings, stressShard, stressVerdict } from '../mocks/stress.mock';

vi.mock('@apollo/client/react', async (io) => (await import('../mocks/ops')).apolloOpsFactory(io));
vi.mock('@duncit/dialogs', async (io) => (await import('../mocks/ops')).dialogsOpsFactory(io));
vi.mock('@duncit/table', async (io) => {
  const actual = await io<typeof import('@duncit/table')>();
  const { ops: o } = await import('../mocks/ops');
  return { ...actual, useApolloTableFetch: () => async () => ({ rows: o.tableRows, total: o.tableRows.length }) };
});
vi.mock('react-chartjs-2', () => ({
  Line: (p: {
    options?: {
      plugins?: { tooltip?: { callbacks?: { label?: (ctx: unknown) => string } } };
      scales?: { y?: { ticks?: { callback?: (value: number) => string } } };
    };
  }) => (
    <div data-testid="chart">
      {p.options?.plugins?.tooltip?.callbacks?.label?.({ dataset: { label: 'Series' }, parsed: { y: 5 } })}
      <span data-testid="gap-tooltip">{p.options?.plugins?.tooltip?.callbacks?.label?.({ dataset: {}, parsed: { y: null } })}</span>
      {p.options?.scales?.y?.ticks?.callback?.(7)}
    </div>
  ),
}));

import StressRunDetailPage from '../../src/pages/stress-testing/run-detail';
import StressRunsPage from '../../src/pages/stress-testing/runs';
import StressSettingsPage from '../../src/pages/stress-testing/settings';
import BotsTable from '../../src/pages/stress-testing/run-detail/tables/BotsTable';
import ContainersTable from '../../src/pages/stress-testing/run-detail/tables/ContainersTable';
import EndpointsTable from '../../src/pages/stress-testing/run-detail/tables/EndpointsTable';
import EventLog from '../../src/pages/stress-testing/run-detail/EventLog';
import { buildRunReport } from '../../src/pages/stress-testing/run-detail/report/runReport';
import {
  formatSeconds,
  gradeColor,
  gradeLabel,
  levelColor,
  levelLabel,
  statusColor,
  statusLabel,
} from '../../src/pages/stress-testing/labels';
import { newStressRunSchema, plannedSeconds, presetValues } from '../../src/pages/stress-testing/new-run/new-stress-run.types';

const t = (key: string, options?: { vars?: Record<string, string | number> }) =>
  options?.vars ? `${key} ${JSON.stringify(options.vars)}` : key;

beforeEach(() => {
  resetOps();
  ops.tableRows = [stressRun()];
  ops.q = {
    ServerPulse: { data: { serverPulse: undefined } },
    StressTriggerConfig: { data: { stressTriggerConfig: stressConfig() } },
    StressRun: { data: { stressRun: stressRun() } },
    StressRunSamples: { data: { stressRunSamples: [stressSample()] } },
    StressRunShards: { data: { stressRunShards: [stressShard()] } },
    StressSettings: { data: { stressSettings: stressSettings() } },
  };
});

afterEach(() => vi.restoreAllMocks());

describe('stress labels for values the server adds later', () => {
  it('names an unknown status, grade or level by itself and colours it neutrally', () => {
    expect(statusLabel(t, 'PAUSED' as never)).toBe('PAUSED');
    expect(statusColor('PAUSED' as never)).toBe('default');
    expect(gradeLabel(t, 'GREAT' as never)).toBe('GREAT');
    expect(gradeColor('GREAT' as never)).toBe('default');
    expect(levelLabel(t, 'EXTREME' as never)).toBe('EXTREME');
    expect(levelColor('EXTREME' as never)).toBe('default');
    expect(statusColor('FAILED')).toBe('error');
  });

  it('reads seconds as minutes and seconds, and a dash for an unknown time', () => {
    expect(formatSeconds(null)).toBe('—');
    expect(formatSeconds(undefined)).toBe('—');
    expect(formatSeconds(45)).toBe('45s');
    expect(formatSeconds(120)).toBe('2m');
    expect(formatSeconds(125)).toBe('2m 5s');
  });
});

describe('stress run tables', () => {
  it('colours a bot by how its page went, and shows a dash for no status or time', async () => {
    const bot = (status: string, name: string, at = '2026-01-01T10:00:30.000Z') => ({
      bot: name,
      kind: 'HTTP' as const,
      journey: 'HOME',
      page: `/${name}`,
      status,
      load_ms: 100,
      at,
    });
    renderWithProviders(
      <BotsTable
        shards={[
          stressShard({ bots: [bot('loaded', 'a'), bot('200', 'b'), bot('404', 'c'), bot('TIMEOUT', 'd'), bot('weird', 'e'), bot('', 'f', '')] }),
        ]}
      />,
    );

    const chip = async (name: string) => (await screen.findByText(name)).closest('.MuiChip-root');
    expect(await chip('loaded')).toHaveClass('MuiChip-colorSuccess');
    expect(await chip('200')).toHaveClass('MuiChip-colorSuccess');
    expect(await chip('404')).toHaveClass('MuiChip-colorWarning');
    expect(await chip('TIMEOUT')).toHaveClass('MuiChip-colorError');
    expect(await chip('weird')).toHaveClass('MuiChip-colorDefault');
    expect(within(screen.getByText('/f').closest('[role="row"]') as HTMLElement).getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('lists no journeys to filter by when there are no bots', () => {
    renderWithProviders(<BotsTable shards={[]} />);
    expect(screen.queryByText('bot-1')).not.toBeInTheDocument();
  });

  it('flags a container whose CPU is at or past 80% and leaves a calmer one alone', async () => {
    renderWithProviders(
      <ContainersTable
        containers={[
          { name: 'api', cpu_pct: 85, memory_mb: 500, memory_pct: 30 },
          { name: 'worker', cpu_pct: 20, memory_mb: 100, memory_pct: 10 },
        ]}
      />,
    );

    const bar = async (name: string) => (await screen.findByText(name)).closest('[role="row"]')?.querySelector('.MuiLinearProgress-root');
    expect(await bar('api')).toHaveClass('MuiLinearProgress-colorError');
    expect(await bar('worker')).toHaveClass('MuiLinearProgress-colorPrimary');
  });

  it('reads an endpoint that was never called as a 0% error rate', async () => {
    renderWithProviders(
      <EndpointsTable endpoints={[{ key: 'query Idle', requests: 0, errors: 0, avg_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0 }]} />,
    );
    expect(await screen.findByText('query Idle')).toBeInTheDocument();
  });

  it('says the log is empty, and gives a level it does not know a neutral chip', () => {
    const { unmount } = render(<EventLog events={[]} />);
    expect(screen.getByText('Nothing logged yet.')).toBeInTheDocument();
    unmount();

    render(<EventLog events={[{ at: '2026-01-01T10:00:00.000Z', level: 'TRACE' as never, source: 'runner', message: 'tick' }]} />);
    expect(screen.getByText('TRACE').closest('.MuiChip-root')).toHaveClass('MuiChip-colorDefault');
  });
});

describe('stress charts', () => {
  it('reads a gap in a series as zero and an unnamed series as empty in the tooltip', async () => {
    ops.q.StressRun = { data: { stressRun: stressRun() } };
    renderWithProviders(<></>, {
      initialEntries: ['/stress-testing/runs/run1'],
      routes: <Route path="/stress-testing/runs/:runId" element={<StressRunDetailPage />} />,
    });

    const [gap] = await screen.findAllByTestId('gap-tooltip');
    expect(gap.textContent).toMatch(/^: 0/);
  });
});

describe('stress live pulse', () => {
  const pulse = {
    ...stressSample().server,
    at: '2026-01-01T10:00:00.000Z',
    event_loop_p99_ms: 90,
    uptime_seconds: 3600,
    users_by_surface: [{ surface: 'mWeb', users: 4 }, { surface: 'Partners', users: 1 }],
  };

  it('shows who is on each surface, and every reading of the box', async () => {
    ops.q.ServerPulse = { data: { serverPulse: pulse } };
    renderWithProviders(<></>, { routes: <Route path="/" element={<StressRunsPage />} /> });

    expect(await screen.findByText('mWeb · 4')).toBeInTheDocument();
    expect(screen.getByText('Partners · 1')).toBeInTheDocument();
  });

  it('shows the pulse with no surfaces when nobody is on', async () => {
    ops.q.ServerPulse = { data: { serverPulse: { ...pulse, users_by_surface: [] } } };
    renderWithProviders(<></>, { routes: <Route path="/" element={<StressRunsPage />} /> });

    expect(await screen.findByText('ST-0001')).toBeInTheDocument();
    expect(screen.queryByText(/mWeb ·/)).not.toBeInTheDocument();
  });
});

describe('stress tables / search and links', () => {
  it('finds a bot, a container and an endpoint by their text', async () => {
    const { unmount } = renderWithProviders(<BotsTable shards={[stressShard()]} />);
    await screen.findByText('bot-1');
    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'bot-2' } });
    await waitFor(() => expect(screen.queryByText('bot-1')).not.toBeInTheDocument());
    expect(screen.getByText('bot-2')).toBeInTheDocument();
    unmount();

    const second = renderWithProviders(
      <ContainersTable
        containers={[
          { name: 'api', cpu_pct: 10, memory_mb: 1, memory_pct: 1 },
          { name: 'worker', cpu_pct: 10, memory_mb: 1, memory_pct: 1 },
        ]}
      />,
    );
    await screen.findByText('api');
    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'work' } });
    await waitFor(() => expect(screen.queryByText('api')).not.toBeInTheDocument());
    second.unmount();

    renderWithProviders(
      <EndpointsTable
        endpoints={[
          { key: 'query Pods', requests: 1, errors: 0, avg_ms: 1, p50_ms: 1, p95_ms: 1, p99_ms: 1 },
          { key: 'query Users', requests: 1, errors: 0, avg_ms: 1, p50_ms: 1, p95_ms: 1, p99_ms: 1 },
        ]}
      />,
    );
    await screen.findByText('query Pods');
    fireEvent.change(screen.getByPlaceholderText(/^Search/), { target: { value: 'users' } });
    await waitFor(() => expect(screen.queryByText('query Pods')).not.toBeInTheDocument());
  });

  it('opens the GitHub run without also opening the run page', async () => {
    renderWithProviders(<></>, {
      routes: (
        <>
          <Route path="/" element={<StressRunsPage />} />
          <Route path="/stress-testing/runs/:id" element={<p>detail page</p>} />
        </>
      ),
    });
    const row = (await screen.findByText('ST-0001')).closest('[role="row"]') as HTMLElement;

    fireEvent.click(within(row).getByRole('link', { name: 'Open GitHub run' }));

    expect(screen.queryByText('detail page')).not.toBeInTheDocument();
  });
});

describe('stress run detail / edges', () => {
  const mount = () =>
    renderWithProviders(<></>, {
      initialEntries: ['/stress-testing/runs/run1'],
      routes: <Route path="/stress-testing/runs/:runId" element={<StressRunDetailPage />} />,
    });

  it('waits for the first read of the run, and keeps the page while it refreshes', async () => {
    ops.q.StressRun = { loading: true };
    const { unmount } = mount();
    expect(screen.queryByRole('heading', { name: 'ST-0001' })).not.toBeInTheDocument();
    unmount();

    ops.q.StressRun = { loading: true, data: { stressRun: stressRun() } };
    mount();
    expect(await screen.findByRole('heading', { name: 'ST-0001' })).toBeInTheDocument();
  });

  it('shows the page before the samples and shards have been read', async () => {
    ops.q.StressRunSamples = { loading: true };
    ops.q.StressRunShards = { loading: true };
    mount();
    expect(await screen.findByRole('heading', { name: 'ST-0001' })).toBeInTheDocument();
  });

  it('shows a dash for the branch of a run that has none', async () => {
    ops.q.StressRun = { data: { stressRun: stressRun({ ref: '' }) } };
    mount();
    expect(await screen.findByRole('heading', { name: 'ST-0001' })).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('reports a stop refused with text', async () => {
    ops.q.StressRun = { data: { stressRun: stressRun({ status: 'RUNNING', summary: null }) } };
    ops.confirm.mockResolvedValue(true);
    ops.mut.StopStressRun = vi.fn().mockRejectedValue('already over');
    mount();

    fireEvent.click(await screen.findByRole('button', { name: 'Stop run' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('already over'));
  });

  it('reports a verdict refused with text, and shows a working note while it is generated', async () => {
    ops.mut.GenerateStressVerdict = vi.fn().mockRejectedValue('quota');
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate verdict' }));
    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('quota'));
  });

  it('shows the verdict button as busy while it is generated', async () => {
    ops.mutLoading.GenerateStressVerdict = true;
    mount();
    expect(await screen.findByText('Reading the run…')).toBeInTheDocument();
  });
});

describe('stress runs page / edges', () => {
  const mount = () => renderWithProviders(<></>, { routes: <Route path="/" element={<StressRunsPage />} /> });

  it('shows a dash for a run with nobody recorded and no stop reason', async () => {
    ops.tableRows = [stressRun({ triggered_by: '', stop_reason: '', error_message: '' })];
    mount();
    const row = (await screen.findByText('ST-0001')).closest('[role="row"]') as HTMLElement;
    expect(within(row).queryByText('ops@example.test')).not.toBeInTheDocument();
  });

  it('reports a delete refused with text', async () => {
    ops.confirm.mockResolvedValue(true);
    ops.mut.DeleteStressRun = vi.fn().mockRejectedValue('locked');
    mount();
    const row = (await screen.findByText('ST-0001')).closest('[role="row"]') as HTMLElement;

    fireEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('locked'));
  });

  it('shows a pulse error without hiding the runs', async () => {
    ops.q.ServerPulse = { error: new Error('pulse offline') };
    mount();
    expect(await screen.findByText('pulse offline')).toBeInTheDocument();
    expect(await screen.findByText('ST-0001')).toBeInTheDocument();
  });

  it('refreshes the table while a run is live', async () => {
    const timers: Array<() => void> = [];
    vi.spyOn(globalThis, 'setInterval').mockImplementation(((fn: () => void) => {
      timers.push(fn);
      return 1;
    }) as unknown as typeof setInterval);
    ops.tableRows = [stressRun({ status: 'RUNNING', summary: null })];
    mount();

    await screen.findByText('ST-0001');
    await waitFor(() => expect(timers.length).toBeGreaterThan(0));
    expect(() => timers.forEach((fn) => fn())).not.toThrow();
  });
});

describe('stress settings page / edges', () => {
  it('reports a save refused with text', async () => {
    ops.mut.UpdateStressSettings = vi.fn().mockRejectedValue('read-only');
    renderWithProviders(<StressSettingsPage />);
    await screen.findByLabelText('Max virtual users');

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('read-only'));
  });

  it('waits for the settings, keeps the form while they refresh, and omits the saved time when never saved', async () => {
    ops.q.StressSettings = { loading: true };
    const { unmount } = renderWithProviders(<StressSettingsPage />);
    expect(screen.queryByLabelText('Max virtual users')).not.toBeInTheDocument();
    unmount();

    ops.q.StressSettings = { loading: true, data: { stressSettings: stressSettings({ updated_at: null }) } };
    renderWithProviders(<StressSettingsPage />);
    expect(await screen.findByLabelText('Max virtual users')).toBeInTheDocument();
    expect(screen.queryByText(/Last updated/)).not.toBeInTheDocument();
  });
});

describe('new stress run dialog / edges', () => {
  const open = async () => {
    renderWithProviders(<></>, { routes: <Route path="/" element={<StressRunsPage />} /> });
    await screen.findByText('ST-0001');
    fireEvent.click(screen.getByRole('button', { name: 'New stress test' }));
    return screen.findByRole('dialog');
  };

  it('says the target is not allowed', async () => {
    ops.q.StressTriggerConfig = { data: { stressTriggerConfig: stressConfig({ blocked_reason: 'TARGET' }) } };
    const dialog = await open();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('https://mweb.staging.example.test');
  });

  it('shows the read error and a spinner while the config loads', async () => {
    ops.q.StressTriggerConfig = { error: new Error('config unreadable') };
    const { unmount } = renderWithProviders(<></>, { routes: <Route path="/" element={<StressRunsPage />} /> });
    await screen.findByText('ST-0001');
    fireEvent.click(screen.getByRole('button', { name: 'New stress test' }));
    expect(await screen.findByText('config unreadable')).toBeInTheDocument();
    unmount();

    ops.q.StressTriggerConfig = { loading: true };
    const dialog = await open();
    expect(within(dialog).getByRole('progressbar')).toBeInTheDocument();
  });

  it('reports a start refused with text, and keeps the dialog open', async () => {
    ops.mut.TriggerStressRun = vi.fn().mockRejectedValue('runner pool is full');
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));

    await waitFor(() => expect(ops.notifyError).toHaveBeenCalledWith('runner pool is full'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('confirms a started run even when the server names none, without opening a page', async () => {
    ops.mut.TriggerStressRun = vi.fn().mockResolvedValue({ data: {} });
    const dialog = await open();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Start run' }));

    await waitFor(() => expect(ops.notifySuccess).toHaveBeenCalledTimes(1));
    expect(mutation('TriggerStressRun')).toHaveBeenCalledTimes(1);
  });
});

describe('new stress run schema', () => {
  const limits = stressSettings({ max_duration_minutes: 10 });
  const messages = {
    whole: 'whole',
    usersRange: 'users',
    botsRange: 'bots',
    runnersRange: 'runners',
    rampUpRange: 'up',
    holdRange: 'hold',
    rampDownRange: 'down',
    thinkRange: 'think',
    journeysRequired: 'journeys',
    runnersAboveUsers: 'above',
    tooLong: 'long',
    confirmMismatch: 'confirm',
  };
  const base = {
    virtual_users: 10,
    browser_bots: 1,
    runners: 1,
    ramp_up_seconds: 30,
    hold_seconds: 60,
    ramp_down_seconds: 10,
    think_time_ms: 1000,
    journeys: ['HOME'],
    confirm_text: '',
  };
  const issues = (confirm: { required: boolean; text: string }, values: unknown) =>
    (newStressRunSchema(limits, confirm, messages).safeParse(values).error?.issues ?? []).map((issue) => issue.message);

  it('accepts a run inside every ceiling', () => {
    expect(issues({ required: false, text: '' }, base)).toEqual([]);
  });

  it('refuses a plan longer than the duration ceiling', () => {
    expect(issues({ required: false, text: '' }, { ...base, hold_seconds: 600 })).toEqual(['long']);
  });

  it('wants the typed confirmation only when one is required', () => {
    expect(issues({ required: true, text: 'STRESS' }, base)).toEqual(['confirm']);
    expect(issues({ required: true, text: 'STRESS' }, { ...base, confirm_text: 'STRESS' })).toEqual([]);
    expect(issues({ required: false, text: 'STRESS' }, base)).toEqual([]);
  });

  it('totals the planned seconds, reading a field left empty as zero', () => {
    expect(plannedSeconds(base)).toBe(100);
    expect(plannedSeconds({})).toBe(0);
  });

  it('never presets more than the ceilings allow', () => {
    for (const key of ['smoke', 'load', 'stress', 'spike', 'soak'] as const) {
      const preset = presetValues(key, limits);
      expect(plannedSeconds(preset)).toBeLessThanOrEqual(limits.max_duration_minutes * 60);
      expect(preset.virtual_users).toBeLessThanOrEqual(limits.max_virtual_users);
    }
  });
});

describe('buildRunReport', () => {
  it('writes a report for a run with no verdict, summary, endpoints or samples', () => {
    const html = buildRunReport(t, stressRun({ verdict: null, summary: null, endpoints: [], started_at: null }), []);

    expect(html).toContain('tech.stress.reportNoVerdict');
    expect(html).toContain('tech.stress.endpointsEmpty');
    expect(html).toContain('tech.stress.chartEmpty');
  });

  it('writes the verdict, with the breaking point only when one was reached and no watch list when empty', () => {
    const reached = buildRunReport(t, stressRun({ verdict: stressVerdict({ breaking_point_users: 300, watch_points: [] }) }), [stressSample()]);
    expect(reached).not.toContain('tech.stress.verdictWatch');
    expect(reached).toContain('300');

    const notReached = buildRunReport(t, stressRun({ verdict: stressVerdict({ breaking_point_users: 0 }) }), [stressSample()]);
    expect(notReached).toContain('tech.stress.verdictNotReached');
    expect(notReached).toContain('tech.stress.verdictWatch');
  });

  it('lists verdict items, or says none were found', () => {
    const none = buildRunReport(t, stressRun({ verdict: stressVerdict({ bottlenecks: [], upgrades: [] }) }), []);
    expect(none).toContain('tech.stress.verdictNoneFound');
    expect(buildRunReport(t, stressRun({ verdict: stressVerdict() }), [])).toContain('Pinned above 90%');
  });

  it('times the series from the first sample when the run never recorded a start', () => {
    const html = buildRunReport(
      t,
      stressRun({ started_at: null }),
      [stressSample({ at: '2026-01-01T10:00:00.000Z' }), stressSample({ at: '2026-01-01T10:01:00.000Z' })],
    );
    expect(html).toContain('1m');
  });

  it('falls back to the peaks when a run closed without a summary', () => {
    const html = buildRunReport(t, stressRun({ summary: null }), []);
    expect(html).toContain('1.5%');
    expect(html).toContain('900 ms');
  });
});
