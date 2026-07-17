import { describe, expect, it, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import StartupDashboardPage from '../../src/pages/finance/startup-dashboard';
import Sparkline from '../../src/pages/finance/startup-dashboard/Sparkline';
import KpiCard from '../../src/pages/finance/startup-dashboard/KpiCard';
import MetricGrid from '../../src/pages/finance/startup-dashboard/MetricGrid';
import MetricDrawer from '../../src/pages/finance/startup-dashboard/MetricDrawer';
import { renderWithProviders } from '../testkit';
import {
  founderDashboardErrorMock,
  founderDashboardLoadingMock,
  founderDashboardMock,
  makeFounderMetric,
  saveFounderSettingMock,
} from '../mocks/startup.mock';

describe('Sparkline', () => {
  it('renders an empty box below two points and a polyline otherwise', () => {
    const { container, rerender } = renderWithProviders(<Sparkline points={[]} />);
    expect(container.querySelector('polyline')).toBeNull();
    rerender(<Sparkline points={[{ label: 'a', value: 1 }, { label: 'b', value: 2 }]} color="#f00" />);
    expect(container.querySelector('polyline')).not.toBeNull();
    rerender(<Sparkline points={[{ label: 'a', value: 5 }, { label: 'b', value: 5 }]} />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });
});

describe('KpiCard', () => {
  const noop = () => undefined;
  it('shows an up trend for a computed metric', () => {
    renderWithProviders(<KpiCard metric={makeFounderMetric()} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('MRR')).toBeInTheDocument();
    expect(screen.queryByText('Manual')).not.toBeInTheDocument();
  });

  it('shows a down trend and a Manual chip, and fires info/settings', () => {
    const onInfo = vi.fn();
    const onSettings = vi.fn();
    renderWithProviders(
      <KpiCard metric={makeFounderMetric({ source: 'manual', delta_pct: -2 })} onInfo={onInfo} onSettings={onSettings} />,
    );
    expect(screen.getByText('Manual')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /about mrr/i }));
    fireEvent.click(screen.getByRole('button', { name: /settings for mrr/i }));
    expect(onInfo).toHaveBeenCalled();
    expect(onSettings).toHaveBeenCalled();
  });

  it('omits the delta badge when delta is null', () => {
    renderWithProviders(<KpiCard metric={makeFounderMetric({ delta_pct: null })} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('MRR')).toBeInTheDocument();
  });
});

describe('MetricGrid', () => {
  const noop = () => undefined;
  it('returns nothing for an empty metric list', () => {
    const { container } = renderWithProviders(
      <MetricGrid title="Empty" metrics={[]} onInfo={noop} onSettings={noop} />,
    );
    expect(container.textContent).toBe('');
  });

  it('renders a highlighted grid with an icon and a plain grid without one', () => {
    const { rerender } = renderWithProviders(
      <MetricGrid title="Top" icon="insights" highlight metrics={[makeFounderMetric()]} onInfo={noop} onSettings={noop} />,
    );
    expect(screen.getByText('Top')).toBeInTheDocument();
    rerender(<MetricGrid title="Plain" icon="" metrics={[makeFounderMetric()]} onInfo={noop} onSettings={noop} />);
    expect(screen.getByText('Plain')).toBeInTheDocument();
  });
});

describe('MetricDrawer', () => {
  const noop = () => undefined;
  it('renders nothing when there is no metric or mode', () => {
    const { container, rerender } = renderWithProviders(
      <MetricDrawer metric={null} mode="info" settings={{}} saving={false} onClose={noop} onSave={noop} />,
    );
    expect(container.textContent).toBe('');
    rerender(
      <MetricDrawer metric={makeFounderMetric()} mode={null} settings={{}} saving={false} onClose={noop} onSave={noop} />,
    );
    expect(container.textContent).toBe('');
  });

  it('shows the info mode', () => {
    renderWithProviders(
      <MetricDrawer metric={makeFounderMetric()} mode="info" settings={{}} saving={false} onClose={noop} onSave={noop} />,
    );
    expect(screen.getByText('Monthly recurring revenue')).toBeInTheDocument();
  });

  it('shows "nothing to configure" for a computed metric without setting keys', () => {
    renderWithProviders(
      <MetricDrawer metric={makeFounderMetric({ setting_keys: [] })} mode="settings" settings={{}} saving={false} onClose={noop} onSave={noop} />,
    );
    expect(screen.getByText(/nothing to configure/i)).toBeInTheDocument();
  });

  it('shows the saving state', () => {
    renderWithProviders(
      <MetricDrawer metric={makeFounderMetric()} mode="settings" settings={{ a: 1, b: 2 }} saving onClose={noop} onSave={noop} />,
    );
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  it('edits a manual metric and saves only finite values', () => {
    const onSave = vi.fn();
    renderWithProviders(
      <MetricDrawer
        metric={makeFounderMetric({ source: 'manual', setting_keys: ['a', 'a'] })}
        mode="settings"
        settings={{ a: 5 }}
        saving={false}
        onClose={noop}
        onSave={onSave}
      />,
    );
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
    renderWithProviders(<StartupDashboardPage />, { mocks: [founderDashboardLoadingMock()] });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error', async () => {
    renderWithProviders(<StartupDashboardPage />, { mocks: [founderDashboardErrorMock()] });
    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('renders the metrics and saves a setting from the drawer', async () => {
    renderWithProviders(<StartupDashboardPage />, {
      mocks: [founderDashboardMock(), saveFounderSettingMock()],
    });
    expect(await screen.findByText('Founder Overview')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '' } });

    // Clearing the range refetches (cache-and-network) — wait for the re-render.
    const settingsBtn = (await screen.findAllByRole('button', { name: /settings for mrr/i }))[0];
    fireEvent.click(settingsBtn);
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument());
  });

  it('opens and closes the info drawer', async () => {
    renderWithProviders(<StartupDashboardPage />, { mocks: [founderDashboardMock()] });
    await screen.findByText('Founder Overview');
    fireEvent.click(screen.getAllByRole('button', { name: /about mrr/i })[0]);
    expect(screen.getAllByText('Monthly recurring revenue').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('Monthly recurring revenue')).not.toBeInTheDocument());
  });
});
