import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import VenueRequestRow from '../VenueRequestRow';

// The menu is the package's own, with its own suite; here it only has to prove
// the row hands it the pod and the row's handlers.
vi.mock('@duncit/host-pod-actions', async (orig) => {
  const actual = await orig<typeof import('@duncit/host-pod-actions')>();
  return {
    ...actual,
    HostPodActionsMenu: (props: {
      podId: string;
      requestChangeLabel: string;
      onSlotRequest: () => void;
      onRequestChange: () => void;
    }) => (
      <div data-testid="menu-stub" data-pod={props.podId} data-label={props.requestChangeLabel}>
        <button type="button" onClick={props.onSlotRequest}>
          slot
        </button>
        <button type="button" onClick={props.onRequestChange}>
          change
        </button>
      </div>
    ),
  };
});

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  pod_id: 'pod-77',
  club_slug: 'weekend-club',
  pod_title: 'Sunday board games',
  place_label: 'The Cafe',
  zone_name: 'Indiranagar',
  pod_type: 'FREE',
  venue_approval_status: 'PENDING',
  created_at: '2026-06-20T05:00:00.000Z',
  pod_date_time: '2026-07-04T12:00:00.000Z',
  pod_images_and_videos: [],
  ...over,
});

function renderRow(p: Record<string, unknown>) {
  const handlers = {
    actions: {} as never,
    onClubAdmin: vi.fn(),
    onSeeAttendance: vi.fn(),
    onChallenges: vi.fn(),
    onSlotRequest: vi.fn(),
    onRequestChange: vi.fn(),
    requestChangeLabel: 'Request change host',
  };
  render(
    <MemoryRouter>
      <VenueRequestRow pod={p} {...handlers} />
    </MemoryRouter>,
  );
  return handlers;
}

describe('VenueRequestRow', () => {
  it('shows the request facts, the pending chip, and links to the pod page', () => {
    renderRow(pod());
    const row = screen.getByTestId('venue-request-row-p1');
    expect(row).toHaveTextContent('Sunday board games');
    expect(row).toHaveTextContent('The Cafe');
    expect(screen.getByTestId('venue-request-open-p1')).toHaveAttribute('href', '/club/weekend-club/pod/pod-77');
    expect(screen.getByTestId('venue-request-approval-p1')).toHaveTextContent('Venue Approval Pending');
    expect(screen.getByTestId('venue-request-type-p1')).toHaveTextContent(/free/i);
    expect(screen.queryByTestId('venue-request-note-p1')).not.toBeInTheDocument();
  });

  it('marks a refused request with the rejected chip and the resubmit note', () => {
    renderRow(pod({ venue_approval_status: 'DECLINED', pod_type: 'PAID' }));
    expect(screen.getByTestId('venue-request-approval-p1')).toHaveTextContent('Venue Rejected');
    expect(screen.getByTestId('venue-request-note-p1')).toBeInTheDocument();
    expect(screen.getByTestId('venue-request-type-p1')).toHaveTextContent(/paid/i);
  });

  it('falls back to the zone, then a dash, for the venue name, and to a dead link without a club', () => {
    const { unmount } = render(
      <MemoryRouter>
        <VenueRequestRow
          pod={pod({ place_label: '', club_slug: '', venue_approval_status: 'APPROVED' })}
          actions={{} as never}
          onClubAdmin={vi.fn()}
          onSeeAttendance={vi.fn()}
          onChallenges={vi.fn()}
          onSlotRequest={vi.fn()}
          onRequestChange={vi.fn()}
          requestChangeLabel="x"
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('venue-request-row-p1')).toHaveTextContent('Indiranagar');
    expect(screen.getByTestId('venue-request-open-p1').getAttribute('href')).not.toContain('/club/');
    // An approved request carries no approval chip.
    expect(screen.queryByTestId('venue-request-approval-p1')).not.toBeInTheDocument();
    unmount();
    renderRow(pod({ place_label: '', zone_name: '' }));
    expect(screen.getByTestId('venue-request-row-p1')).toHaveTextContent('—');
  });

  it('gives the menu this pod and the row handlers', () => {
    const handlers = renderRow(pod());
    const menu = screen.getByTestId('menu-stub');
    expect(menu).toHaveAttribute('data-pod', 'p1');
    expect(menu).toHaveAttribute('data-label', 'Request change host');
    fireEvent.click(screen.getByText('slot'));
    fireEvent.click(screen.getByText('change'));
    expect(handlers.onSlotRequest).toHaveBeenCalledTimes(1);
    expect(handlers.onRequestChange).toHaveBeenCalledTimes(1);
  });
});
