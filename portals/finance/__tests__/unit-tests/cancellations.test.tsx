import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  CancellationsDashboardPage,
  HostCancelPage,
  VenueCancelPage,
} from '../../src/pages/finance/cancellations-page';
import { cancellationSearchText } from '../../src/pages/finance/cancellations-page/queries';
import { resetTableControls, tableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  cancellationStatsErrorMock,
  cancellationStatsMock,
  makeCancellationRow,
  makeVenueDeclineRow,
  podCancellationsMock,
} from '../mocks/cancellations.mock';
import { dashboardLayoutMock } from '../mocks/dashboard-layout.mock';

beforeEach(() => {
  resetTableControls();
});

const query = (over: Partial<(typeof tableControls.queries)[number]>) => ({
  ...tableControls.queries[0],
  ...over,
});

/** The pod title cell of every rendered row, in order. */
const podTitles = () => screen.getAllByTestId('cell-pod_title').map((cell) => cell.textContent);

describe('cancellation search text', () => {
  it('reads the pod, the reason, who cancelled and the venue', () => {
    expect(cancellationSearchText(makeCancellationRow())).toBe(
      'Sunset Yoga Event cancelled — rain Hema Kaur Blue Hall',
    );
  });

  it('leaves the venue out when the pod had none', () => {
    expect(cancellationSearchText(makeVenueDeclineRow())).toBe('Book Club Double booking Venue Owner ');
  });
});

describe('CancellationsDashboardPage', () => {
  const mocks = (rows = [makeCancellationRow(), makeVenueDeclineRow()]) => [
    cancellationStatsMock(),
    podCancellationsMock(null, rows),
    dashboardLayoutMock('finance.cancellations'),
  ];

  it('renders the KPI tiles and every cancellation with its kind', async () => {
    renderWithProviders(<CancellationsDashboardPage />, { path: '/', mocks: mocks() });
    await waitFor(() => expect(screen.getByText('Total pod cancels')).toBeInTheDocument());
    expect(screen.getByText('Cancelled by hosts')).toBeInTheDocument();
    expect(screen.getByText('Cancelled by venues')).toBeInTheDocument();
    expect(screen.getByText('Cancelled by club admins')).toBeInTheDocument();
    expect(screen.getByText('Total refund amount')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('₹1,250')).toBeInTheDocument());
    expect(screen.getByText('6')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Sunset Yoga')).toBeInTheDocument());
    expect(screen.getByText('Book Club')).toBeInTheDocument();
    // The dashboard is the one list that names who cancelled.
    const kinds = screen.getAllByTestId('cell-kind').map((cell) => cell.textContent);
    expect(kinds).toEqual(['Host', 'Venue']);
  });

  it('opens a cancellation in the detail dialog and closes it again', async () => {
    renderWithProviders(<CancellationsDashboardPage />, { path: '/', mocks: mocks() });
    await waitFor(() => expect(screen.getByText('Sunset Yoga')).toBeInTheDocument());

    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Cancelled by Host')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('shows the stats error and zeroed tiles when the stats query fails', async () => {
    renderWithProviders(<CancellationsDashboardPage />, {
      path: '/',
      mocks: [cancellationStatsErrorMock(), podCancellationsMock(null, []), dashboardLayoutMock('finance.cancellations')],
    });
    expect(await screen.findByText('stats unavailable')).toBeInTheDocument();
    // No stats means no currency either: every tile reads a bare zero.
    expect(screen.getAllByTestId('stat-value').map((tile) => tile.textContent)).toEqual([
      '0',
      '0',
      '0',
      '0',
      '0',
    ]);
    await waitFor(() =>
      expect(screen.getByText('No pods have been cancelled yet.')).toBeInTheDocument(),
    );
  });
});

describe('HostCancelPage', () => {
  it('lists host cancellations and opens the detail dialog with refunds + venue money', async () => {
    renderWithProviders(<HostCancelPage />, {
      path: '/',
      mocks: [podCancellationsMock('HOST', [makeCancellationRow()])],
    });
    await waitFor(() => expect(screen.getByText('Sunset Yoga')).toBeInTheDocument());
    expect(screen.getByText('Event cancelled — rain')).toBeInTheDocument();
    // Some of the attendee money is still out, and the row says so.
    expect(screen.getByText('₹250 · 2 refunded')).toBeInTheDocument();
    expect(screen.getByText('₹200 · 1 not refunded')).toBeInTheDocument();
    expect(screen.getByTestId('cell-venue_amount')).toHaveTextContent('₹1,200');

    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Cancelled by Host/i)).toBeInTheDocument();
    expect(within(dialog).getByText('₹250 (2 payments)')).toBeInTheDocument();
    expect(within(dialog).getByText('₹200 (1 payments)')).toBeInTheDocument();
    expect(within(dialog).getByText(/still unrefunded/)).toBeInTheDocument();
    expect(within(dialog).getByText('Blue Hall')).toBeInTheDocument();
    expect(within(dialog).getByText('₹1,200')).toBeInTheDocument();

    fireEvent.keyDown(dialog, { key: 'Escape', code: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('fills the gaps of a system cancellation with its kind and dashes', async () => {
    const row = makeCancellationRow({
      kind: 'SYSTEM',
      actor_name: '',
      reason: '',
      host_names: [],
      pod_date_time: null,
      unrefunded_count: 0,
      unrefunded_total: 0,
      venue_name: null,
    });
    renderWithProviders(<HostCancelPage />, { path: '/', mocks: [podCancellationsMock('HOST', [row])] });
    await waitFor(() => expect(screen.getByText('Sunset Yoga')).toBeInTheDocument());
    expect(screen.getByTestId('cell-actor_name')).toHaveTextContent('—');
    expect(screen.getByTestId('cell-reason')).toHaveTextContent('—');
    expect(screen.queryByText(/not refunded/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('row-open'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Cancelled by System')).toBeInTheDocument();
    const rows = within(dialog).getAllByTestId('info-row').map((r) => r.textContent);
    expect(rows).toContain('Cancelled bySystem');
    expect(rows).toContain('Reason—');
    expect(rows).toContain('Hosts—');
    expect(rows).toContain('Pod was scheduled for—');
    expect(rows).toContain('Venue—');
    expect(within(dialog).queryByText(/still unrefunded/)).not.toBeInTheDocument();
  });

  it('searches the list by venue and sorts it by what was refunded', async () => {
    const rows = [makeCancellationRow(), makeVenueDeclineRow({ kind: 'HOST' })];
    tableControls.queries = [query({ search: 'blue hall' })];
    const { unmount } = renderWithProviders(<HostCancelPage />, {
      path: '/',
      mocks: [podCancellationsMock('HOST', rows)],
    });
    await waitFor(() => expect(podTitles()).toEqual(['Sunset YogaHema Kaur']));
    unmount();

    tableControls.queries = [query({ sortBy: 'refunded_total', sortDir: 'asc' })];
    renderWithProviders(<HostCancelPage />, { path: '/', mocks: [podCancellationsMock('HOST', rows)] });
    await waitFor(() => expect(podTitles()).toEqual(['Book ClubHema Kaur', 'Sunset YogaHema Kaur']));
  });
});

describe('VenueCancelPage', () => {
  it('lists venue declines and shows the no-venue detail state', async () => {
    renderWithProviders(<VenueCancelPage />, {
      path: '/',
      mocks: [podCancellationsMock('VENUE', [makeVenueDeclineRow()])],
    });
    await waitFor(() => expect(screen.getByText('Book Club')).toBeInTheDocument());
    // No venue on the booking means no venue money to show.
    expect(screen.getByTestId('cell-venue_name')).toHaveTextContent('—');
    expect(screen.getByTestId('cell-venue_amount')).toHaveTextContent('—');

    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('This pod had no venue booking.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('renders the empty state when nothing was declined', async () => {
    renderWithProviders(<VenueCancelPage />, {
      path: '/',
      mocks: [podCancellationsMock('VENUE', [])],
    });
    await waitFor(() =>
      expect(screen.getByText('No venue-declined pods yet.')).toBeInTheDocument(),
    );
  });
});
