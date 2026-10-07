import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactNode } from 'react';

import PodRequestList from '../components/PodRequestList';
import PodRequestStatusChip from '../components/PodRequestStatusChip';
import RespondButtons from '../components/RespondButtons';
import type { PodRequestRowData } from '../queries';

// The admin's date format is its own suite; here the row only has to show the request's date.
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDate: (d: string) => `date:${d}` }),
}));

const venueRow = (over: Partial<PodRequestRowData> = {}): PodRequestRowData => ({
  id: 'req-venue',
  direction: 'VENUE_TO_HOST',
  status: 'REQUESTED',
  viewer_side: 'HOST',
  note: 'Weekend run club?',
  venue: {
    id: 'venue-1',
    venue_name: 'Gomti Arena',
    category: 'Sports',
    locality: 'Gomti Nagar',
    city: 'Lucknow',
    cover_image_url: '',
  },
  host: { user_id: 'host-1', name: 'Asha', photo_url: '', categories: ['Running'] },
  created_at: '2026-10-01T10:00:00.000Z',
  ...over,
});

const wrap = (ui: ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PodRequestList', () => {
  it('shows only its empty line when there are no requests', () => {
    wrap(<PodRequestList requests={[]} emptyText="Nothing yet" testId="incoming" />);

    expect(screen.getByTestId('incoming-empty')).toHaveTextContent('Nothing yet');
    expect(screen.queryByTestId('incoming')).not.toBeInTheDocument();
  });

  it('shows the venue to a host viewer: name, category · place, note, status and a link to the detail', () => {
    wrap(<PodRequestList requests={[venueRow()]} emptyText="Nothing yet" testId="incoming" />);

    const row = screen.getByTestId('pod-request-row-req-venue');
    expect(within(row).getByText('Gomti Arena')).toBeInTheDocument();
    expect(within(row).getByText('Sports · Gomti Nagar · Lucknow')).toBeInTheDocument();
    expect(within(row).getByText('Weekend run club?')).toBeInTheDocument();
    expect(within(row).getByText('Requested')).toBeInTheDocument();
    expect(within(row).getByText('date:2026-10-01T10:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByTestId('pod-request-open-req-venue')).toHaveAttribute('href', '/pod-requests/req-venue');
    expect(screen.queryByTestId('incoming-empty')).not.toBeInTheDocument();
  });

  it('shows the host to a venue viewer, without a note line when the note is empty', () => {
    wrap(
      <PodRequestList
        requests={[venueRow({ id: 'req-host', viewer_side: 'VENUE', note: '', status: 'POD_CREATED' })]}
        emptyText="Nothing yet"
        testId="sent"
      />,
    );

    const row = screen.getByTestId('pod-request-row-req-host');
    expect(within(row).getByText('Asha')).toBeInTheDocument();
    expect(within(row).getByText('Running')).toBeInTheDocument();
    expect(within(row).queryByText('Gomti Arena')).not.toBeInTheDocument();
    expect(within(row).queryByText('Weekend run club?')).not.toBeInTheDocument();
    expect(within(row).getByText('Pod created')).toBeInTheDocument();
  });

  it('renders the per-row actions beside the link, one set per request', () => {
    wrap(
      <PodRequestList
        requests={[venueRow(), venueRow({ id: 'req-2' })]}
        emptyText="Nothing yet"
        testId="incoming"
        renderActions={(request) => <span data-testid={`actions-${request.id}`} />}
      />,
    );

    expect(screen.getByTestId('actions-req-venue')).toBeInTheDocument();
    expect(screen.getByTestId('actions-req-2')).toBeInTheDocument();
    expect(within(screen.getByTestId('pod-request-open-req-venue')).queryByTestId('actions-req-venue')).toBeNull();
  });
});

describe('PodRequestStatusChip', () => {
  it.each([
    ['REQUESTED', 'Requested', 'MuiChip-colorWarning'],
    ['SLOT_CONFIRMED', 'Slot confirmed', 'MuiChip-colorSuccess'],
    ['POD_CREATED', 'Pod created', 'MuiChip-colorSuccess'],
    ['REJECTED', 'Declined', 'MuiChip-colorDefault'],
    ['CANCELLED', 'Withdrawn', 'MuiChip-colorDefault'],
    ['EXPIRED', 'Expired', 'MuiChip-colorDefault'],
  ] as const)('labels %s as "%s" in its tone', (status, label, colorClass) => {
    render(<PodRequestStatusChip status={status} testId="chip" />);

    const chip = screen.getByTestId('chip');
    expect(chip).toHaveTextContent(label);
    expect(chip).toHaveClass(colorClass);
  });
});

describe('RespondButtons', () => {
  it('answers false for decline and true for accept', () => {
    const onAnswer = vi.fn();
    render(<RespondButtons acceptLabel="Accept" declineLabel="Decline" busy={false} onAnswer={onAnswer} testId="r" />);

    fireEvent.click(screen.getByTestId('r-decline'));
    fireEvent.click(screen.getByTestId('r-accept'));

    expect(onAnswer).toHaveBeenNthCalledWith(1, false);
    expect(onAnswer).toHaveBeenNthCalledWith(2, true);
    expect(screen.getByTestId('r-accept')).toHaveTextContent('Accept');
    expect(screen.getByTestId('r-decline')).toHaveTextContent('Decline');
  });

  it('disables both answers while a write is in flight', () => {
    const onAnswer = vi.fn();
    render(<RespondButtons acceptLabel="Accept" declineLabel="Decline" busy onAnswer={onAnswer} testId="r" />);

    expect(screen.getByTestId('r-accept')).toBeDisabled();
    expect(screen.getByTestId('r-decline')).toBeDisabled();
    fireEvent.click(screen.getByTestId('r-accept'));
    expect(onAnswer).not.toHaveBeenCalled();
  });
});
