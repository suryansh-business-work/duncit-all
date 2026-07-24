import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ServerInfo } from '../../src/pages/server/queries';
import { makeDockerInfo, makeServerInfo } from '../mocks/server.mock';

const m = vi.hoisted(() => ({
  query: {
    data: undefined as unknown,
    loading: false,
    error: undefined as Error | undefined,
    refetch: vi.fn(),
  },
  refetchSpy: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return {
    ...actual,
    useApolloClient: () => ({}),
    useQuery: () => m.query,
    useMutation: () => [m.mutate, { loading: false }],
  };
});
vi.mock('@duncit/table', () => ({ useApolloTableFetch: () => vi.fn() }));
vi.mock('@duncit/ui', () => ({
  StatCard: (p: { label: string; value: string }) => (
    <div>
      {p.label}:{p.value}
    </div>
  ),
}));
vi.mock('../../src/pages/server/ServerInfoDetails', () => ({
  default: (p: { info: ServerInfo }) => <div>details:{p.info.os.hostname}</div>,
}));
vi.mock('../../src/pages/server/DockerContainersTable', () => ({
  default: (p: {
    refetchRef: { current: (() => void) | null };
    onRestart: (name: string) => void;
  }) => {
    p.refetchRef.current = m.refetchSpy;
    return (
      <div data-testid="docker-table">
        <button onClick={() => p.onRestart('duncit-crm')}>restart-crm</button>
      </div>
    );
  },
}));
vi.mock('../../src/pages/server/DockerLogsDialog', () => ({
  default: (p: { name: string | null; onClose: () => void }) =>
    p.name ? (
      <div data-testid="logs-dialog">
        {p.name}
        <button onClick={p.onClose}>close-logs</button>
      </div>
    ) : null,
}));

import ServerInfoPage from '../../src/pages/server/ServerInfoPage';
import DockerPage from '../../src/pages/server/DockerPage';

const availableDocker = () => ({
  data: { techDockerInfo: makeDockerInfo() },
  loading: false,
  error: undefined,
  refetch: vi.fn(),
});

beforeEach(() => {
  m.query = { data: undefined, loading: false, error: undefined, refetch: vi.fn() };
  m.refetchSpy.mockReset();
  m.mutate.mockReset();
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
    m.query = {
      data: { techServerInfo: makeServerInfo() },
      loading: false,
      error: undefined,
      refetch,
    };
    render(<ServerInfoPage />);
    expect(screen.getByText('details:srv912221')).toBeInTheDocument();
    expect(screen.getByText(/CPU USAGE:45%/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('DockerPage', () => {
  it('shows an error alert when the query fails with no data', () => {
    m.query = { data: undefined, loading: false, error: new Error('sock'), refetch: vi.fn() };
    render(<DockerPage />);
    expect(screen.getByText(/Could not load Docker info: sock/)).toBeInTheDocument();
  });

  it('warns when docker is unavailable with an error detail', () => {
    m.query = {
      data: {
        techDockerInfo: makeDockerInfo({ available: false, error: 'no socket', version: '' }),
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    };
    render(<DockerPage />);
    expect(screen.getByText(/Docker is not reachable.*no socket/)).toBeInTheDocument();
  });

  it('warns when docker is unavailable without an error detail', () => {
    m.query = {
      data: { techDockerInfo: makeDockerInfo({ available: false, error: null, version: '' }) },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    };
    render(<DockerPage />);
    expect(screen.getByText(/Mount the Docker/)).toBeInTheDocument();
  });

  it('renders chips + table when available and refreshes both query and table', () => {
    const refetch = vi.fn();
    m.query = {
      data: { techDockerInfo: makeDockerInfo() },
      loading: false,
      error: undefined,
      refetch,
    };
    render(<DockerPage />);
    expect(screen.getByText('3 running')).toBeInTheDocument();
    expect(screen.getByText('5 total')).toBeInTheDocument();
    expect(screen.getByText(/Docker 25\.0/)).toBeInTheDocument();
    expect(screen.getByTestId('docker-table')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(refetch).toHaveBeenCalled();
    expect(m.refetchSpy).toHaveBeenCalled();
  });

  it('restarts a container: opens the log dialog, refreshes, then closes the dialog', async () => {
    const q = availableDocker();
    m.query = q;
    m.mutate.mockResolvedValue({ data: { techRestartContainer: { ok: true, error: null } } });
    render(<DockerPage />);
    fireEvent.click(screen.getByText('restart-crm'));
    expect(await screen.findByTestId('logs-dialog')).toHaveTextContent('duncit-crm');
    await waitFor(() => expect(q.refetch).toHaveBeenCalled());
    expect(m.refetchSpy).toHaveBeenCalled();
    expect(screen.queryByText(/Could not restart/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('close-logs'));
    await waitFor(() => expect(screen.queryByTestId('logs-dialog')).not.toBeInTheDocument());
  });

  it('shows the restart error the daemon reports, and dismisses it', async () => {
    m.query = availableDocker();
    m.mutate.mockResolvedValue({
      data: { techRestartContainer: { ok: false, error: 'daemon busy' } },
    });
    render(<DockerPage />);
    fireEvent.click(screen.getByText('restart-crm'));
    expect(await screen.findByText('daemon busy')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByText('daemon busy')).not.toBeInTheDocument());
  });

  it('shows a default error when the restart fails without a message', async () => {
    m.query = availableDocker();
    m.mutate.mockResolvedValue({ data: { techRestartContainer: { ok: false, error: null } } });
    render(<DockerPage />);
    fireEvent.click(screen.getByText('restart-crm'));
    expect(await screen.findByText('Could not restart duncit-crm')).toBeInTheDocument();
  });

  it('shows a default error when the mutation returns no result', async () => {
    m.query = availableDocker();
    m.mutate.mockResolvedValue({});
    render(<DockerPage />);
    fireEvent.click(screen.getByText('restart-crm'));
    expect(await screen.findByText('Could not restart duncit-crm')).toBeInTheDocument();
  });

  it('surfaces a thrown restart error', async () => {
    m.query = availableDocker();
    m.mutate.mockRejectedValue(new Error('network down'));
    render(<DockerPage />);
    fireEvent.click(screen.getByText('restart-crm'));
    expect(await screen.findByText('network down')).toBeInTheDocument();
  });

  it('surfaces a non-Error thrown restart failure with a default message', async () => {
    m.query = availableDocker();
    m.mutate.mockRejectedValue('boom');
    render(<DockerPage />);
    fireEvent.click(screen.getByText('restart-crm'));
    expect(await screen.findByText('Could not restart duncit-crm')).toBeInTheDocument();
  });
});
