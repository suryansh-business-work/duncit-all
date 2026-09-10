import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { TableFetch } from '@duncit/table';
import PodsTable from './PodsTable';
import type { PodRow } from './queries';

const full: PodRow = {
  id: 'p1',
  pod_title: 'Morning Badminton',
  pod_date_time: '2026-01-05T10:00:00.000Z',
  pod_mode: 'PHYSICAL',
  is_active: true,
  venue_approval_status: 'APPROVED',
  host_names: ['Asha', 'Ravi'],
  club_slug: 'badminton-club',
};
const sparse: PodRow = {
  id: 'p2',
  pod_title: 'Mystery Meetup',
  pod_date_time: '',
  pod_mode: 'VIRTUAL',
  is_active: false,
  venue_approval_status: 'NONE',
  host_names: [],
  club_slug: '',
};

const makeFetch = (rows: PodRow[]) =>
  vi.fn(async () => ({ rows, total: rows.length })) as TableFetch<PodRow> & ReturnType<typeof vi.fn>;

const fmt = (iso: string | null | undefined) => (iso ? `on ${iso}` : '');

beforeEach(() => {
  window.localStorage.clear();
});

describe('PodsTable', () => {
  it('renders pods with host and approval columns when enabled', async () => {
    const fetchRows = makeFetch([full, sparse]);
    render(
      <PodsTable
        tableId="test-pods-full"
        fetchRows={fetchRows}
        formatDateTime={fmt}
        showHosts
        showApproval
      />,
    );
    expect(await screen.findByText('Morning Badminton')).toBeInTheDocument();
    expect(screen.getByText('badminton-club')).toBeInTheDocument();
    expect(screen.getByText('Asha, Ravi')).toBeInTheDocument();
    expect(screen.getByText('on 2026-01-05T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('PHYSICAL')).toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('NONE')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    // sparse row falls back to dashes for club slug, hosts and date
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('hides the host and approval columns by default', async () => {
    const fetchRows = makeFetch([full]);
    render(<PodsTable tableId="test-pods-min" fetchRows={fetchRows} formatDateTime={fmt} />);
    expect(await screen.findByText('Morning Badminton')).toBeInTheDocument();
    expect(screen.queryByText('Host(s)')).not.toBeInTheDocument();
    expect(screen.queryByText('Venue approval')).not.toBeInTheDocument();
  });

  it('maps the time toggle onto pod_date_time filters', async () => {
    const fetchRows = makeFetch([full]);
    render(<PodsTable tableId="test-pods-toggle" fetchRows={fetchRows} formatDateTime={fmt} />);
    expect(await screen.findByText('Morning Badminton')).toBeInTheDocument();
    expect(fetchRows).toHaveBeenLastCalledWith(expect.objectContaining({ filters: [] }));

    fireEvent.click(screen.getByRole('button', { name: 'Upcoming' }));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: [expect.objectContaining({ field: 'pod_date_time', op: 'gte' })],
        }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Started' }));
    await waitFor(() =>
      expect(fetchRows).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: [expect.objectContaining({ field: 'pod_date_time', op: 'lte' })],
        }),
      ),
    );

    // Clicking the selected toggle again keeps the current filter (null change ignored).
    fireEvent.click(screen.getByRole('button', { name: 'Started' }));
    expect(screen.getByRole('button', { name: 'Started' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the custom empty text', async () => {
    const fetchRows = makeFetch([]);
    render(
      <PodsTable
        tableId="test-pods-empty"
        fetchRows={fetchRows}
        formatDateTime={fmt}
        emptyText="No pods for this host yet."
      />,
    );
    expect(await screen.findByText('No pods for this host yet.')).toBeInTheDocument();
  });
});
