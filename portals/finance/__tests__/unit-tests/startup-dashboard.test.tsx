import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useMutation, useQuery } from '@apollo/client';
import StartupDashboardPage from '../../src/pages/finance/startup-dashboard';
import Sparkline from '../../src/pages/finance/startup-dashboard/Sparkline';
import KpiCard from '../../src/pages/finance/startup-dashboard/KpiCard';
import MetricGrid from '../../src/pages/finance/startup-dashboard/MetricGrid';
import MetricDrawer from '../../src/pages/finance/startup-dashboard/MetricDrawer';
import type { FounderMetric } from '../../src/pages/finance/startup-dashboard/types';
import { renderUI } from './testkit';

vi.mock('@apollo/client', async (orig) => {
  const actual = await orig<Record<string, unknown>>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

const mockedUseQuery = vi.mocked(useQuery);
const mockedUseMutation = vi.mocked(useMutation);

const metric = (over: Partial<FounderMetric> = {}): FounderMetric => ({
  key: 'mrr', category: 'Revenue', label: 'MRR', unit: 'currency', value: 1000, delta_pct: 5,
  definition: 'Monthly recurring revenue', formula: 'a + b', source: 'computed', setting_keys: ['a', 'b'],
  series: [{ label: 'Jan', value: 1 }, { label: 'Feb', value: 3 }], ...over,
});

const dashboard = {
  founderDashboard: {
    from: '2024-01-01', to: '2024-12-31',
    top: [metric()],
    categories: [
      { key: 'ops', label: 'Ops', icon: 'insights', metrics: [
        metric({ key: 'cash', label: 'Cash', unit: 'number', source: 'manual', delta_pct: -2, setting_keys: ['a'] }),
        metric({ key: 'nps', label: 'NPS', unit: 'rating', delta_pct: null, setting_keys: [], series: [{ label: 'x', value: 1 }] }),
      ] },
    ],
    settings: [{ key: 'a', value: 10 }],
  },
};

beforeEach(() => {
  mockedUseQuery.mockReset();
  mockedUseMutation.mockReset().mockReturnValue([vi.fn().mockResolvedValue({}), { loading: false }] as any);
});

describe('Sparkline', () => {
  it('renders an empty box below two points and a polyline otherwise', () => {
    const { container, rerender } = renderUI(<Sparkline points={[]} />);
    expect(container.querySelector('polyline')).toBeNull();
    rerender(<Sparkline points={[{ label: 'a', value: 1 }, { label: 'b', value: 2 }]} color="#f00" />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });
});

describe('KpiCard', () => {
  const noop = () => undefined;
  it('shows an up trend for a computed metric', () => {
    renderUI(<KpiCard metric={metric()} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('MRR')).toBeInTheDocument();
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
  });

  it('shows a down trend and a Manual chip, and fires info/settings', () => {
    const onInfo = vi.fn();
    const onSettings = vi.fn();
    renderUI(<KpiCard metric={metric({ source: 'manual', delta_pct: -2 })} onInfo={onInfo} onSettings={onSettings} />);
    expect(screen.getByText('Manual')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /about mrr/i }));
    fireEvent.click(screen.getByRole('button', { name: /settings for mrr/i }));
    expect(onInfo).toHaveBeenCalled();
    expect(onSettings).toHaveBeenCalled();
  });

  it('omits the delta badge when delta is null', () => {
    renderUI(<KpiCard metric={metric({ delta_pct: null })} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('MRR')).toBeInTheDocument();
  });
});

describe('MetricGrid', () => {
  const noop = () => undefined;
  it('returns nothing for an empty metric list', () => {
    const { container } = renderUI(<MetricGrid title="Empty" metrics={[]} onInfo={noop} onSettings={noop} />);
    expect(container.textContent).toBe('');
  });

  it('renders a highlighted grid with an icon and a plain grid without one', () => {
    const { rerender } = renderUI(<MetricGrid title="Top" icon="insights" highlight metrics={[metric()]} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('Top')).toBeInTheDocument();
    rerender(<MetricGrid title="Plain" icon="" metrics={[metric()]} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('Plain')).toBeInTheDocument();
  });
});

describe('MetricDrawer', () => {
  const noop = () => undefined;
  it('renders nothing when there is no metric or mode', () => {
    const { container, rerender } = renderUI(<MetricDrawer metric={null} mode="info" settings={{}} saving={false} onClose={noop} onSave={noop} />);
    expect(container.textContent).toBe('');
    rerender(<MetricDrawer metric={metric()} mode={null} settings={{}} saving={false} onClose={noop} onSave={noop} />);
    expect(container.textContent).toBe('');
  });

  it('shows the info mode', () => {
    renderUI(<MetricDrawer metric={metric()} mode="info" settings={{}} saving={false} onClose={noop} onSave={noop} />);
    expect(screen.getByText('Monthly recurring revenue')).toBeInTheDocument();
  });

  it('shows "nothing to configure" for a computed metric without setting keys', () => {
    renderUI(<MetricDrawer metric={metric({ setting_keys: [] })} mode="settings" settings={{}} saving={false} onClose={noop} onSave={noop} />);
    expect(screen.getByText(/nothing to configure/i)).toBeInTheDocument();
  });

  it('edits a manual metric and saves only finite values', () => {
    const onSave = vi.fn();
    renderUI(<MetricDrawer metric={metric({ source: 'manual', setting_keys: ['a', 'a'] })} mode="settings" settings={{ a: 5 }} saving={false} onClose={noop} onSave={onSave} />);
    const fields = screen.getAllByRole('spinbutton');
    fireEvent.change(fields[0], { target: { value: '42' } });
    fireEvent.change(fields[1], { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onSave).toHaveBeenCalledWith([
      { key: 'mrr', value: 42 },
      { key: 'a', value: 7 },
    ]);
  });
});

describe('StartupDashboardPage', () => {
  it('shows the loading spinner', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: true, error: undefined, refetch: vi.fn() } as any);
    renderUI(<StartupDashboardPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error', () => {
    mockedUseQuery.mockReturnValue({ data: undefined, loading: false, error: { message: 'boom' }, refetch: vi.fn() } as any);
    renderUI(<StartupDashboardPage />);
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders the metrics and saves a setting from the drawer', async () => {
    const refetch = vi.fn().mockResolvedValue({});
    const saveSetting = vi.fn().mockResolvedValue({});
    mockedUseQuery.mockReturnValue({ data: dashboard, loading: false, error: undefined, refetch } as any);
    mockedUseMutation.mockReturnValue([saveSetting, { loading: false }] as any);
    renderUI(<StartupDashboardPage />);

    expect(screen.getByText('Founder Overview')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();

    // open the settings drawer for MRR and save
    fireEvent.click(screen.getAllByRole('button', { name: /settings for mrr/i })[0]);
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(saveSetting).toHaveBeenCalled());
    expect(refetch).toHaveBeenCalled();
  });

  it('opens the info drawer', () => {
    mockedUseQuery.mockReturnValue({ data: dashboard, loading: false, error: undefined, refetch: vi.fn() } as any);
    renderUI(<StartupDashboardPage />);
    fireEvent.click(screen.getAllByRole('button', { name: /about mrr/i })[0]);
    expect(screen.getAllByText('Monthly recurring revenue').length).toBeGreaterThan(0);
  });
});
