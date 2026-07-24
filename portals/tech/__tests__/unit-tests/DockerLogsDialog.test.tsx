import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const m = vi.hoisted(() => ({ query: { data: undefined as unknown } }));
vi.mock('@apollo/client', async (io) => {
  const actual = await io<typeof import('@apollo/client')>();
  return { ...actual, useQuery: () => m.query };
});

import DockerLogsDialog from '../../src/pages/server/DockerLogsDialog';

beforeEach(() => {
  m.query = { data: undefined };
});

describe('DockerLogsDialog', () => {
  it('renders nothing visible when no container is selected', () => {
    render(<DockerLogsDialog name={null} onClose={vi.fn()} />);
    expect(screen.queryByText(/Logs ·/)).not.toBeInTheDocument();
  });

  it('shows the streamed container logs and closes', () => {
    m.query = { data: { techContainerLogs: 'starting server…\nlistening on 2001' } };
    const onClose = vi.fn();
    render(<DockerLogsDialog name="duncit-server" onClose={onClose} />);
    expect(screen.getByText(/Logs · duncit-server/)).toBeInTheDocument();
    expect(screen.getByText(/listening on 2001/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a loading placeholder until the first logs arrive', () => {
    render(<DockerLogsDialog name="duncit-server" onClose={vi.fn()} />);
    expect(screen.getByText('Loading logs…')).toBeInTheDocument();
  });
});
