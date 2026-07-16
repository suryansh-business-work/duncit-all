import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { useColorMode } from './hooks/useColorMode';
import { useBranding } from './hooks/useBranding';
import { useStatusData, type StatusData } from './hooks/useStatusData';
import { useFilteredGroups } from './hooks/useFilteredGroups';
import type { ServiceGroup, SummaryResponse } from './types';

vi.mock('./hooks/useColorMode', () => ({ useColorMode: vi.fn() }));
vi.mock('./hooks/useBranding', () => ({ useBranding: vi.fn() }));
vi.mock('./hooks/useStatusData', () => ({ useStatusData: vi.fn() }));
vi.mock('./hooks/useFilteredGroups', () => ({ useFilteredGroups: vi.fn() }));
vi.mock('react-chartjs-2', () => ({ Bar: () => null }));
vi.mock('./components/service-details-dialog', () => ({
  ServiceDetailsDialog: ({ service, onClose }: { service: { name: string } | null; onClose: () => void }) =>
    service ? (
      <button type="button" onClick={onClose}>
        close-{service.name}
      </button>
    ) : null,
}));

const service = { key: 'api', name: 'API', url: 'https://api.test', description: 'Core API' };
const group: ServiceGroup = { title: 'Consoles', items: [service] };
const summary = {
  generated_at: 't',
  overall: { state: 'operational', operational: 1, degraded: 0, down: 0, total: 1, uptime_90d: 99.9 },
  services: {
    api: {
      latest: null,
      uptime_24h: 100,
      uptime_7d: 100,
      uptime_90d: 99.9,
      state: 'operational',
      active_incidents: 0,
      daily: [],
    },
  },
  global: [{ date: '2026-07-10', uptime: 100, state: 'operational', operational: 1, total: 1 }],
} as unknown as SummaryResponse;

const data = (over: Partial<StatusData>): StatusData => ({
  groups: null,
  environment: null,
  summary: null,
  incidents: null,
  loading: false,
  error: null,
  lastUpdated: null,
  ...over,
});

afterEach(() => vi.clearAllMocks());

const stubShell = () => {
  vi.mocked(useColorMode).mockReturnValue({ mode: 'light', toggleMode: vi.fn() });
  vi.mocked(useBranding).mockReturnValue({ appName: 'Duncit', logoUrl: '/logo.svg', primaryColor: null });
};

describe('App', () => {
  it('shows the loading skeleton before the catalog arrives', () => {
    stubShell();
    vi.mocked(useStatusData).mockReturnValue(data({ loading: true }));
    vi.mocked(useFilteredGroups).mockReturnValue([]);

    const { container } = render(<App />);
    expect(screen.getByText('Checking services…')).toBeTruthy();
    expect(container.querySelector('.MuiSkeleton-root')).toBeTruthy();
    expect(screen.queryByText('No services match your filters.')).toBeNull();
  });

  it('renders the full dashboard and opens/closes the details dialog', () => {
    stubShell();
    vi.mocked(useStatusData).mockReturnValue(
      data({ groups: [group], environment: 'production', summary, incidents: [], error: 'Boom', lastUpdated: new Date() }),
    );
    vi.mocked(useFilteredGroups).mockReturnValue([group]);

    render(<App />);
    expect(screen.getByRole('heading', { name: 'Duncit Status' })).toBeTruthy();
    expect(screen.getByText('Boom')).toBeTruthy();
    expect(screen.getByText('99.90%')).toBeTruthy();
    expect(screen.getByText('API')).toBeTruthy();
    expect(screen.getByText('No incidents reported in the last 90 days.')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Show status and details for API'));
    expect(screen.getByText('close-API')).toBeTruthy();
    fireEvent.click(screen.getByText('close-API'));
    expect(screen.queryByText('close-API')).toBeNull();
  });

  it('shows the empty-filter message when nothing matches', () => {
    stubShell();
    vi.mocked(useStatusData).mockReturnValue(data({ groups: [group], summary, incidents: [] }));
    vi.mocked(useFilteredGroups).mockReturnValue([]);

    render(<App />);
    expect(screen.getByText('No services match your filters.')).toBeTruthy();
    expect(screen.getByLabelText('Search services')).toBeTruthy();
  });
});
