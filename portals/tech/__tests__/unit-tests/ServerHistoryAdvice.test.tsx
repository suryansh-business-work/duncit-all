import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type {
  ServerAdvice,
  ServerHistory,
  ServerHistoryDay,
  ServerHistorySummary,
} from '../../src/pages/server/history/queries';

const m = vi.hoisted(() => ({
  advice: { data: undefined as unknown, error: undefined as Error | undefined },
  generate: vi.fn(),
  generating: false,
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
  history: { history: undefined as unknown, loading: false, error: undefined as Error | undefined },
  chart: [] as Array<{ title: string; labels: string[]; series: Array<{ id: string; values: Array<number | null> }>; emptyText: string }>,
}));

vi.mock('@apollo/client/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@apollo/client/react')>();
  return {
    ...actual,
    useQuery: () => m.advice,
    useMutation: () => [m.generate, { loading: m.generating }],
  };
});
vi.mock('@duncit/dialogs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@duncit/dialogs')>();
  return { ...actual, notifyError: m.notifyError, notifySuccess: m.notifySuccess };
});
vi.mock('../../src/pages/server/advice/AdviceBody', () => ({
  default: (p: { advice: { headline: string } }) => <div data-testid="advice-body">{p.advice.headline}</div>,
}));
vi.mock('../../src/pages/server/history/useServerHistory', () => ({ useServerHistory: () => m.history }));
vi.mock('../../../tests/src/pages/stress-testing/run-detail/charts/TimeSeriesChart', () => ({
  default: (p: (typeof m.chart)[number]) => {
    m.chart.push(p);
    return <div data-testid="chart">{p.title}</div>;
  },
}));

import ServerAdviceCard from '../../src/pages/server/advice';
import HistoryCharts from '../../src/pages/server/history/HistoryCharts';
import HistorySummary from '../../src/pages/server/history/HistorySummary';
import ServerHistoryPanel from '../../src/pages/server/history';

const day = (over: Partial<ServerHistoryDay> = {}): ServerHistoryDay =>
  ({
    date: '2026-09-01',
    samples: 0,
    cpuAvgPct: null,
    cpuPeakPct: null,
    memoryAvgPct: null,
    memoryPeakPct: null,
    swapPeakPct: null,
    diskPct: null,
    requests: null,
    errors5xx: null,
    latencyP95Ms: null,
    latencyPeakMs: null,
    eventLoopP99PeakMs: null,
    probeLatencyMs: null,
    ...over,
  }) as ServerHistoryDay;

const summary = (over: Partial<ServerHistorySummary> = {}): ServerHistorySummary => ({
  daysWithData: 12,
  cpuAvgPct: null,
  cpuPeakPct: null,
  memoryAvgPct: null,
  memoryPeakPct: null,
  diskPct: null,
  diskGrowthBytesPerDay: null,
  daysUntilDiskFull: null,
  latencyP95Ms: null,
  probeLatencyMs: null,
  uptimePct: null,
  requests: 1200,
  errors5xx: 3,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  m.advice = { data: undefined, error: undefined };
  m.generating = false;
  m.generate.mockResolvedValue({});
  m.history = { history: undefined, loading: false, error: undefined };
  m.chart = [];
});

describe('ServerAdviceCard', () => {
  const advice = { headline: 'All good' } as unknown as ServerAdvice;

  it('offers to generate when nothing has been written yet', () => {
    render(<ServerAdviceCard />);
    expect(screen.queryByTestId('advice-body')).toBeNull();
    expect(screen.getByRole('button')).toHaveTextContent(/generate/i);
  });

  it('shows the kept recommendation and offers to regenerate it', () => {
    m.advice = { data: { techServerAdvice: advice }, error: undefined };
    render(<ServerAdviceCard />);
    expect(screen.getByTestId('advice-body')).toHaveTextContent('All good');
    expect(screen.getByRole('button')).toHaveTextContent(/regenerate/i);
  });

  it('hides the old advice and shows the working message while a new one is written', () => {
    m.advice = { data: { techServerAdvice: advice }, error: undefined };
    m.generating = true;
    render(<ServerAdviceCard />);
    expect(screen.queryByTestId('advice-body')).toBeNull();
  });

  it('shows the read failure', () => {
    m.advice = { data: undefined, error: new Error('advice unreadable') };
    render(<ServerAdviceCard />);
    expect(screen.getByRole('alert')).toHaveTextContent('advice unreadable');
  });

  it('asks the server to generate against the API host and confirms', async () => {
    render(<ServerAdviceCard />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(m.notifySuccess).toHaveBeenCalled());
    expect(m.generate).toHaveBeenCalledWith({ variables: { sslHost: expect.any(String) } });
    expect(m.notifyError).not.toHaveBeenCalled();
  });

  it('reports a generation failure with the server message', async () => {
    m.generate.mockRejectedValue(new Error('OpenAI quota exceeded'));
    render(<ServerAdviceCard />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('OpenAI quota exceeded'));
    expect(m.notifySuccess).not.toHaveBeenCalled();
  });

  it('stringifies a non-Error failure', async () => {
    m.generate.mockRejectedValue('quota');
    render(<ServerAdviceCard />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(m.notifyError).toHaveBeenCalledWith('quota'));
  });
});

describe('HistoryCharts', () => {
  it('draws one chart per measure with a label for every day and null for missing readings', () => {
    render(
      <HistoryCharts
        days={[
          day({ date: '2026-09-01', samples: 5, cpuAvgPct: 40, latencyP95Ms: 120 }),
          day({ date: '2026-09-02', samples: 3 }),
        ]}
      />,
    );
    expect(screen.getAllByTestId('chart')).toHaveLength(6);
    const cpu = m.chart.find((c) => c.title.toLowerCase().includes('cpu'));
    expect(cpu?.labels).toHaveLength(2);
    expect(cpu?.series[0].values).toEqual([40, null]);
    const latency = m.chart.find((c) => c.series.some((s) => s.id === 'p95'));
    expect(latency?.series.find((s) => s.id === 'p95')?.values).toEqual([120, null]);
  });

  it('treats a day with only a probe reading as data', () => {
    render(<HistoryCharts days={[day({ samples: 0, probeLatencyMs: 80 })]} />);
    expect(m.chart[0].labels).toHaveLength(1);
  });

  it('passes no labels and the empty text when no day has a reading', () => {
    render(<HistoryCharts days={[day(), day({ date: '2026-09-02' })]} />);
    expect(m.chart.every((c) => c.labels.length === 0)).toBe(true);
    expect(m.chart[0].emptyText).toBeTruthy();
  });
});

describe('HistorySummary', () => {
  it('shows a dash for every reading the month has none of, and the steady disk hint', () => {
    render(<HistorySummary summary={summary()} periodDays={30} />);
    // cpu, memory, disk, latency and uptime have no reading
    expect(screen.getAllByText('—')).toHaveLength(5);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows measured values and the days-until-full forecast', () => {
    render(
      <HistorySummary
        summary={summary({
          cpuAvgPct: 41.5,
          cpuPeakPct: 88,
          memoryAvgPct: 60,
          memoryPeakPct: 75,
          diskPct: 70,
          diskGrowthBytesPerDay: 1024 ** 3,
          daysUntilDiskFull: 45,
          latencyP95Ms: 230,
          probeLatencyMs: 90,
          uptimePct: 99.9,
        })}
        periodDays={30}
      />,
    );
    expect(screen.queryAllByText('—')).toHaveLength(0);
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it('keeps the steady hint when growth is known but no fill date is', () => {
    const none = render(<HistorySummary summary={summary()} periodDays={7} />);
    const steady = none.container.textContent;
    none.unmount();
    const growing = render(
      <HistorySummary summary={summary({ diskGrowthBytesPerDay: 100, daysUntilDiskFull: null })} periodDays={7} />,
    );
    expect(growing.container.textContent).toBe(steady);
  });
});

describe('ServerHistoryPanel', () => {
  const history = { timeZone: 'Asia/Kolkata', days: [day()], containers: [], summary: summary() } as unknown as ServerHistory;

  it('shows a spinner while the first read is in flight', () => {
    m.history = { history: undefined, loading: true, error: undefined };
    const { container } = render(<ServerHistoryPanel />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('shows nothing under the title when there is neither data nor a load', () => {
    const { container } = render(<ServerHistoryPanel />);
    expect(container.querySelector('.MuiCircularProgress-root')).toBeNull();
    expect(screen.queryByTestId('chart')).toBeNull();
  });

  it('shows the error and, if a previous answer exists, still shows its data', () => {
    m.history = { history, loading: false, error: new Error('refresh failed') };
    render(<ServerHistoryPanel />);
    expect(screen.getByRole('alert')).toHaveTextContent('refresh failed');
    expect(screen.getAllByTestId('chart')).toHaveLength(6);
  });

  it('renders the summary and charts for the month', () => {
    m.history = { history, loading: false, error: undefined };
    render(<ServerHistoryPanel />);
    expect(screen.getAllByTestId('chart')).toHaveLength(6);
    expect(screen.getByText('12')).toBeInTheDocument();
  });
});
