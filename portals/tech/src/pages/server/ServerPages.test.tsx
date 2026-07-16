import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { DockerInfo, ServerInfo } from './queries';

const m = vi.hoisted(() => ({
  query: { data: undefined as unknown, loading: false, error: undefined as Error | undefined, refetch: vi.fn() },
  refetchSpy: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: () => m.query,
  };
});
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('@duncit/ui', () => ({ StatCard: (p: { label: string; value: string }) => <div>{p.label}:{p.value}</div> }));
vi.mock('./ServerInfoDetails', () => ({ default: (p: { info: ServerInfo }) => <div>details:{p.info.os.hostname}</div> }));
vi.mock('./DockerContainersTable', () => ({
  default: (p: { refetchRef: { current: (() => void) | null } }) => {
    p.refetchRef.current = m.refetchSpy;
    return <div data-testid="docker-table" />;
  },
}));

import ServerInfoPage from './ServerInfoPage';
import DockerPage from './DockerPage';

const serverInfo: ServerInfo = {
  os: { platform: 'linux', distro: 'Linux', type: 'Linux', release: '6', arch: 'x64', hostname: 'srv', kernelUptimeSeconds: 90000, processUptimeSeconds: 60, nodeVersion: 'v20' },
  cpu: { model: 'x', cores: 2, speedMhz: 2400, loadAvg1: 0, loadAvg5: 0, loadAvg15: 0, usagePercent: 40 },
  memory: { totalBytes: 8 * 1024 ** 3, freeBytes: 4 * 1024 ** 3, usedBytes: 4 * 1024 ** 3, usagePercent: 50 },
  disk: { path: '/', totalBytes: 100 * 1024 ** 3, freeBytes: 50 * 1024 ** 3, usedBytes: 50 * 1024 ** 3, usagePercent: 50 },
  network: [], sshPort: 22, ssl: null, collectedAt: '2026-01-01T00:00:00.000Z',
} as ServerInfo;

beforeEach(() => {
  m.query = { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  m.refetchSpy.mockReset();
});

describe('ServerInfoPage', () => {
  it('shows a spinner while loading with no data', () => {
    m.query = { data: undefined, loading: true, error: undefined, refetch: vi.fn() };
    render(<ServerInfoPage />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows an error alert when the query fails with no data', () => {
    m.query = { data: undefined, loading: false, error: new Error('down'), refetch: vi.fn() };
    render(<ServerInfoPage />);
    expect(screen.getByText(/Could not load server info: down/)).toBeInTheDocument();
  });

  it('renders the stat cards + details and refetches on Refresh', () => {
    const refetch = vi.fn();
    m.query = { data: { techServerInfo: serverInfo }, loading: false, error: undefined, refetch };
    render(<ServerInfoPage />);
    expect(screen.getByText('details:srv')).toBeInTheDocument();
    expect(screen.getByText(/CPU USAGE:40%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalled();
  });
});

const docker = (over: Partial<DockerInfo> = {}): DockerInfo =>
  ({ version: '25.0', available: true, containersRunning: 3, containersTotal: 5, error: null, ...over }) as DockerInfo;

describe('DockerPage', () => {
  it('shows an error alert when the query fails with no data', () => {
    m.query = { data: undefined, loading: false, error: new Error('sock'), refetch: vi.fn() };
    render(<DockerPage />);
    expect(screen.getByText(/Could not load Docker info: sock/)).toBeInTheDocument();
  });

  it('warns when docker is unavailable with an error detail', () => {
    m.query = { data: { techDockerInfo: docker({ available: false, error: 'no socket', version: '' }) }, loading: false, error: undefined, refetch: vi.fn() };
    render(<DockerPage />);
    expect(screen.getByText(/Docker is not reachable.*no socket/)).toBeInTheDocument();
  });

  it('warns when docker is unavailable without an error detail', () => {
    m.query = { data: { techDockerInfo: docker({ available: false, error: null, version: '' }) }, loading: false, error: undefined, refetch: vi.fn() };
    render(<DockerPage />);
    expect(screen.getByText(/Mount the Docker/)).toBeInTheDocument();
  });

  it('renders chips + table when available and refreshes both query and table', () => {
    const refetch = vi.fn();
    m.query = { data: { techDockerInfo: docker() }, loading: false, error: undefined, refetch };
    render(<DockerPage />);
    expect(screen.getByText('3 running')).toBeInTheDocument();
    expect(screen.getByText('5 total')).toBeInTheDocument();
    expect(screen.getByText(/Docker 25\.0/)).toBeInTheDocument();
    expect(screen.getByTestId('docker-table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalled();
    expect(m.refetchSpy).toHaveBeenCalled();
  });
});
