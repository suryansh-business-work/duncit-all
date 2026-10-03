import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import StudioPodRow from '../StudioPodRow';
import type { StudioPod } from '../types';

vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `when:${d}` }),
}));

const ROW = 'studio-pods-row-p1';

const pod = (over: Partial<StudioPod> = {}): StudioPod => ({
  id: 'p1',
  pod_slug: 'sunset-jam',
  pod_title: 'Sunset Jam',
  pod_date_time: '2099-08-01T10:00:00.000Z',
  pod_end_date_time: '2099-08-01T12:00:00.000Z',
  pod_amount: 499,
  pod_type: 'PAID',
  no_of_spots: 10,
  attendee_count: 6,
  pod_attendees: ['u1', 'u2', 'u3', 'u4'],
  host_names: ['Asha', '', 'Ravi'],
  owner_id: 'venue-1',
  owner_name: 'Blue Room',
  bucket: 'UPCOMING',
  is_active: true,
  completed_at: null,
  cancelled_at: null,
  created_at: '2099-07-01T10:00:00.000Z',
  ...over,
});

describe('StudioPodRow', () => {
  it('shows what the pod is, when and where it runs, who hosts it and how full it is', () => {
    render(<StudioPodRow pod={pod()} currencySymbol="₹" testId={ROW} />);

    const row = screen.getByTestId(ROW);
    expect(within(row).getByText('Sunset Jam')).toBeInTheDocument();
    expect(within(row).getByText('when:2099-08-01T10:00:00.000Z · Blue Room')).toBeInTheDocument();
    expect(screen.getByTestId(`${ROW}-state`)).toHaveTextContent('Upcoming');
    // Blank host names are dropped, not rendered as an empty entry.
    expect(screen.getByTestId(`${ROW}-hosts`)).toHaveTextContent('HostsAsha, Ravi');
    expect(screen.getByTestId(`${ROW}-spots`)).toHaveTextContent('Spots6/10');
    // People counts heads, not the extra seats they bought.
    expect(screen.getByTestId(`${ROW}-people`)).toHaveTextContent('People4');
    expect(screen.getByTestId(`${ROW}-price`)).toHaveTextContent(/499/);
    expect(screen.getByTestId(`${ROW}-price`)).toHaveTextContent('₹');
    expect(screen.getByRole('progressbar', { name: 'Spots' })).toHaveAttribute('aria-valuenow', '60');
  });

  it('reads Free for a free pod and says when nobody hosts it', () => {
    render(
      <StudioPodRow
        pod={pod({ pod_type: 'FREE', pod_amount: 0, host_names: ['', ''] })}
        currencySymbol="₹"
        testId={ROW}
      />,
    );
    expect(screen.getByTestId(`${ROW}-price`)).toHaveTextContent('TicketFree');
    expect(screen.getByTestId(`${ROW}-hosts`)).toHaveTextContent('No host assigned');
  });

  it.each([
    ['ONGOING', 'Live now'],
    ['COMPLETED', 'Past'],
    ['CANCELLED', 'Cancelled'],
  ] as const)('labels a %s pod as "%s"', (bucket, label) => {
    render(<StudioPodRow pod={pod({ bucket })} currencySymbol="₹" testId={ROW} />);
    expect(screen.getByTestId(`${ROW}-state`)).toHaveTextContent(label);
  });

  it('shows an empty bar for a pod with no spots', () => {
    render(<StudioPodRow pod={pod({ no_of_spots: 0, attendee_count: 0 })} currencySymbol="₹" testId={ROW} />);
    expect(screen.getByRole('progressbar', { name: 'Spots' })).toHaveAttribute('aria-valuenow', '0');
  });

  it('is a plain row without a handler and a button that opens the pod with one', () => {
    const { unmount } = render(<StudioPodRow pod={pod()} currencySymbol="₹" testId={ROW} />);
    expect(within(screen.getByTestId(ROW)).queryByRole('button')).not.toBeInTheDocument();
    unmount();

    const onOpen = vi.fn();
    const p = pod();
    render(<StudioPodRow pod={p} currencySymbol="₹" testId={ROW} onOpen={onOpen} />);
    fireEvent.click(within(screen.getByTestId(ROW)).getByRole('button'));
    expect(onOpen).toHaveBeenCalledWith(p);
  });

  it('has no actions menu unless a cancel or request-change handler is given', () => {
    render(<StudioPodRow pod={pod()} currencySymbol="₹" testId={ROW} />);
    expect(screen.queryByTestId(`${ROW}-actions`)).not.toBeInTheDocument();
  });

  it('cancels the bound pod from the actions menu', () => {
    const onCancel = vi.fn();
    const p = pod();
    render(<StudioPodRow pod={p} currencySymbol="₹" testId={ROW} onCancel={onCancel} />);

    fireEvent.click(screen.getByTestId(`${ROW}-actions`));
    fireEvent.click(screen.getByTestId('studio-pod-action-cancel'));
    expect(onCancel).toHaveBeenCalledWith(p);
    // Only the request-change handler adds that item.
    expect(screen.queryByTestId('studio-pod-action-request-change')).not.toBeInTheDocument();
  });

  it('requests a change for the bound pod under the caller’s label', () => {
    const onRequestChange = vi.fn();
    const p = pod();
    render(
      <StudioPodRow
        pod={p}
        currencySymbol="₹"
        testId={ROW}
        onRequestChange={onRequestChange}
        requestChangeLabel="Request Change Venue"
      />,
    );

    fireEvent.click(screen.getByTestId(`${ROW}-actions`));
    const item = screen.getByTestId('studio-pod-action-request-change');
    expect(item).toHaveTextContent('Request Change Venue');
    fireEvent.click(item);
    expect(onRequestChange).toHaveBeenCalledWith(p);
    expect(screen.queryByTestId('studio-pod-action-cancel')).not.toBeInTheDocument();
  });

  it('renders without any inner test ids when the row has none', () => {
    render(<StudioPodRow pod={pod()} currencySymbol="₹" />);
    expect(screen.getByText('Sunset Jam')).toBeInTheDocument();
    expect(screen.queryByTestId(`${ROW}-state`)).not.toBeInTheDocument();
    expect(document.querySelector('[data-testid$="-hosts"]')).toBeNull();
  });
});
