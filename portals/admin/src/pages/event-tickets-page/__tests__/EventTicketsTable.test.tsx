import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EventTicketsTable from '../EventTicketsTable';
import type { EventTicketRow } from '../queries';

vi.mock('@duncit/table', () => import('../../../__tests__/table-mock'));

const WHEN = '2026-04-11T13:45:00.000Z';
const CHECKED = '2026-04-11T14:02:00.000Z';
const CREATED = '2026-04-01T07:00:00.000Z';

const humanDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

const makeTicket = (over: Partial<EventTicketRow> = {}): EventTicketRow => ({
  id: 't1',
  ticket_code: 'DUN-TKT-9001',
  pod_id: 'pod1',
  user_id: 'u1',
  status: 'VALID',
  checked_in_at: null,
  pod_title: 'Sunrise Yoga',
  pod_date_time: WHEN,
  pod_mode: 'PHYSICAL',
  venue_name: 'Lotus Studio',
  zone_name: 'Baner',
  user_name: 'Jane Doe',
  user_email: 'jane@duncit.test',
  created_at: CREATED,
  ...over,
});

interface RenderArgs {
  rows?: EventTicketRow[];
  onDownload?: (t: EventTicketRow) => void;
  onCheckIn?: (t: EventTicketRow) => void;
}

const renderTable = ({ rows = [makeTicket()], onDownload = vi.fn(), onCheckIn = vi.fn() }: RenderArgs = {}) => {
  const refetchRef = createRef<(() => void) | null>() as { current: (() => void) | null };
  refetchRef.current = null;
  const fetchRows = vi.fn(async () => ({ rows, total: rows.length }));
  const view = render(
    <EventTicketsTable
      fetchRows={fetchRows}
      refetchRef={refetchRef}
      onDownload={onDownload}
      onCheckIn={onCheckIn}
    />,
  );
  return { ...view, fetchRows, refetchRef, onDownload, onCheckIn };
};

describe('EventTicketsTable / columns', () => {
  it('renders every column header the tickets grid declares', async () => {
    renderTable();
    await screen.findByTestId('col-ticket_code');
    const headers = Array.from(screen.getByTestId('table-headers').children).map((n) => n.textContent);
    expect(headers).toEqual([
      'Ticket',
      'Event',
      'Attendee',
      'When',
      'Status',
      'Checked in',
      'Created',
      'Actions',
    ]);
  });

  it('renders the ticket code, event, attendee and formatted dates for a row', async () => {
    renderTable({ rows: [makeTicket()] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-ticket_code')).toHaveTextContent('DUN-TKT-9001');
    expect(screen.getByTestId('cell-pod_title')).toHaveTextContent('Sunrise Yoga');
    expect(screen.getByTestId('cell-user_name')).toHaveTextContent('Jane Doe');
    expect(screen.getByTestId('cell-user_name')).toHaveTextContent('jane@duncit.test');
    expect(screen.getByTestId('value-pod_date_time')).toHaveTextContent(humanDate(WHEN));
    expect(screen.getByTestId('value-created_at')).toHaveTextContent(humanDate(CREATED));
  });

  it('dashes a missing date instead of printing an invalid one', async () => {
    renderTable({ rows: [makeTicket({ pod_date_time: null, checked_in_at: null })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('value-pod_date_time')).toHaveTextContent('—');
    expect(screen.getByTestId('value-checked_in_at')).toHaveTextContent('—');
  });

  it('de-underscores the status for the searchable value and the chip label', async () => {
    renderTable({ rows: [makeTicket({ status: 'CHECKED_IN', checked_in_at: CHECKED })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('value-status')).toHaveTextContent('CHECKED IN');
    expect(screen.getByTestId('cell-status')).toHaveTextContent(humanDate(CHECKED));
  });

  it('omits the check-in timestamp line while the ticket is still valid', async () => {
    renderTable({ rows: [makeTicket({ status: 'VALID', checked_in_at: null })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-status')).toHaveTextContent('VALID');
    expect(screen.getByTestId('cell-status')).not.toHaveTextContent('—');
  });

  it('captions a virtual pod as Virtual, ignoring any stale venue name', async () => {
    renderTable({ rows: [makeTicket({ pod_mode: 'VIRTUAL', venue_name: 'Lotus Studio' })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-pod_title')).toHaveTextContent('Virtual');
    expect(screen.getByTestId('cell-pod_title')).not.toHaveTextContent('Lotus Studio');
  });

  it('captions a physical pod with the venue name', async () => {
    renderTable({ rows: [makeTicket({ pod_mode: 'PHYSICAL', venue_name: 'Lotus Studio' })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-pod_title')).toHaveTextContent('Lotus Studio');
  });

  it('falls back to the zone name, then to Physical, when there is no venue', async () => {
    const { unmount } = renderTable({ rows: [makeTicket({ venue_name: null, zone_name: 'Baner' })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-pod_title')).toHaveTextContent('Baner');
    unmount();

    renderTable({ rows: [makeTicket({ venue_name: null, zone_name: null })] });
    await screen.findByTestId('table-row');
    expect(screen.getByTestId('cell-pod_title')).toHaveTextContent('Physical');
  });
});

describe('EventTicketsTable / actions', () => {
  it('hands the row to onDownload when the download action is used', async () => {
    const row = makeTicket();
    const { onDownload } = renderTable({ rows: [row] });
    fireEvent.click(await screen.findByRole('button', { name: 'Download ticket' }));
    expect(onDownload).toHaveBeenCalledWith(row);
  });

  it('hands the row to onCheckIn for a valid ticket', async () => {
    const row = makeTicket({ status: 'VALID' });
    const { onCheckIn } = renderTable({ rows: [row] });
    const button = await screen.findByRole('button', { name: 'Check in' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onCheckIn).toHaveBeenCalledWith(row);
  });

  it('disables check-in for a ticket that is already checked in', async () => {
    const { onCheckIn } = renderTable({ rows: [makeTicket({ status: 'CHECKED_IN', checked_in_at: CHECKED })] });
    const button = await screen.findByRole('button', { name: 'Check in' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onCheckIn).not.toHaveBeenCalled();
  });

  it('disables check-in for a cancelled ticket', async () => {
    renderTable({ rows: [makeTicket({ status: 'CANCELLED' })] });
    expect(await screen.findByRole('button', { name: 'Check in' })).toBeDisabled();
  });
});

describe('EventTicketsTable / grid wiring', () => {
  it('loads rows through the injected fetch bridge with the newest-first default sort', async () => {
    const { fetchRows } = renderTable();
    await screen.findByTestId('table-row');
    expect(fetchRows).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'created_at', sortDir: 'desc' }),
    );
  });

  it('shows the empty message when the server returns no tickets', async () => {
    renderTable({ rows: [] });
    expect(await screen.findByTestId('table-empty')).toHaveTextContent('No tickets yet.');
  });

  it('exposes a refetch handle that re-runs the fetch bridge', async () => {
    const { fetchRows, refetchRef } = renderTable();
    await screen.findByTestId('table-row');
    expect(fetchRows).toHaveBeenCalledTimes(1);
    refetchRef.current?.();
    await waitFor(() => expect(fetchRows).toHaveBeenCalledTimes(2));
  });

  it('advertises the ticket search placeholder', async () => {
    renderTable();
    expect(await screen.findByTestId('duncit-table')).toHaveAttribute(
      'data-search-placeholder',
      'Search code, attendee or event',
    );
  });
});
