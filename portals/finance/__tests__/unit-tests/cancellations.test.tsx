import { describe, expect, it, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  CancellationsDashboardPage,
  HostCancelPage,
  VenueCancelPage,
} from '../../src/pages/finance/cancellations-page';
import {
  applyCancellationQuery,
  type PodCancellationRow,
} from '../../src/pages/finance/cancellations-page/queries';
import { resetTableControls } from './mocks/table';
import { renderWithProviders } from '../testkit';
import {
  cancellationStatsErrorMock,
  cancellationStatsMock,
  makeCancellationRow,
  makeVenueDeclineRow,
  podCancellationsMock,
} from '../mocks/cancellations.mock';

beforeEach(() => {
  resetTableControls();
});

const baseQuery = {
  search: '',
  filters: [],
  page: 1,
  pageSize: 10,
  sortBy: null,
  sortDir: 'asc' as const,
};

describe('applyCancellationQuery', () => {
  const rows: PodCancellationRow[] = [makeCancellationRow(), makeVenueDeclineRow()];

  it('searches across pod title, reason, actor and venue', () => {
    expect(applyCancellationQuery(rows, { ...baseQuery, search: 'double' }).total).toBe(1);
    expect(applyCancellationQuery(rows, { ...baseQuery, search: 'hema' }).total).toBe(1);
    expect(applyCancellationQuery(rows, { ...baseQuery, search: 'blue hall' }).total).toBe(1);
    expect(applyCancellationQuery(rows, { ...baseQuery, search: 'zzz' }).total).toBe(0);
  });

  it('sorts by the requested comparator in both directions and paginates', () => {
    const asc = applyCancellationQuery(rows, { ...baseQuery, sortBy: 'refunded_total' });
    expect(asc.rows[0].pod_title).toBe('Book Club');
    const desc = applyCancellationQuery(rows, {
      ...baseQuery,
      sortBy: 'refunded_total',
      sortDir: 'desc',
    });
    expect(desc.rows[0].pod_title).toBe('Sunset Yoga');
    const paged = applyCancellationQuery(rows, { ...baseQuery, pageSize: 1, page: 2 });
    expect(paged.rows).toHaveLength(1);
    expect(paged.total).toBe(2);
  });
});

describe('CancellationsDashboardPage', () => {
  it('renders the KPI tiles and every cancellation with its kind', async () => {
    renderWithProviders(<CancellationsDashboardPage />, {
      path: '/',
      mocks: [
        cancellationStatsMock(),
        podCancellationsMock(null, [makeCancellationRow(), makeVenueDeclineRow()]),
      ],
    });
    await waitFor(() => expect(screen.getByText('Total pod cancels')).toBeInTheDocument());
    expect(screen.getByText('Cancelled by hosts')).toBeInTheDocument();
    expect(screen.getByText('Cancelled by venues')).toBeInTheDocument();
    expect(screen.getByText('Total refund amount')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Sunset Yoga')).toBeInTheDocument());
    expect(screen.getByText('Book Club')).toBeInTheDocument();
  });

  it('shows an error alert when the stats query fails', async () => {
    renderWithProviders(<CancellationsDashboardPage />, {
      path: '/',
      mocks: [cancellationStatsErrorMock(), podCancellationsMock(null, [])],
    });
    expect(await screen.findByRole('alert')).toBeInTheDocument();
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

    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Cancelled by Host/i)).toBeInTheDocument();
    expect(within(dialog).getByText('₹250 (2 payments)')).toBeInTheDocument();
    expect(within(dialog).getByText('₹200 (1 payments)')).toBeInTheDocument();
    expect(within(dialog).getByText('Blue Hall')).toBeInTheDocument();
    expect(within(dialog).getByText('₹1,200')).toBeInTheDocument();
  });
});

describe('VenueCancelPage', () => {
  it('lists venue declines and shows the no-venue detail state', async () => {
    renderWithProviders(<VenueCancelPage />, {
      path: '/',
      mocks: [podCancellationsMock('VENUE', [makeVenueDeclineRow()])],
    });
    await waitFor(() => expect(screen.getByText('Book Club')).toBeInTheDocument());
    fireEvent.click(screen.getAllByTestId('row-open')[0]);
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('This pod had no venue booking.')).toBeInTheDocument();
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
