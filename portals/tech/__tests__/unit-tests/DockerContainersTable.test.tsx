import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DockerContainersTable from '../../src/pages/server/DockerContainersTable';
import type { DockerContainer } from '../../src/pages/server/queries';
import { makeDockerContainer } from '../mocks/server.mock';

const fetchFor = (rows: DockerContainer[]) => vi.fn(async () => ({ rows, total: rows.length }));

beforeEach(() => {
  window.localStorage.clear();
});

describe('DockerContainersTable', () => {
  it('shows the empty state when there are no containers', async () => {
    render(<DockerContainersTable fetchRows={fetchFor([])} refetchRef={{ current: null }} />);
    expect(await screen.findByText('No containers found.')).toBeInTheDocument();
  });

  it('renders running/stopped rows, the id fallback and created dates', async () => {
    const rows = [
      makeDockerContainer({ id: 'abc123', name: 'server', state: 'running', status: 'Up 3 days' }),
      makeDockerContainer({ id: 'def456', name: '', image: 'nginx:1.27', state: 'exited', status: 'Exited (0)', createdAt: null }),
    ];
    render(<DockerContainersTable fetchRows={fetchFor(rows)} refetchRef={{ current: null }} />);

    expect(await screen.findByText('server')).toBeInTheDocument();
    expect(screen.getByText('def456')).toBeInTheDocument(); // nameless container falls back to its id
    expect(screen.getByText('duncit/server:latest')).toBeInTheDocument();
    expect(screen.getByText('running')).toBeInTheDocument();
    expect(screen.getByText('exited')).toBeInTheDocument();
    expect(screen.getByText('Up 3 days')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument(); // null createdAt
  });
});
