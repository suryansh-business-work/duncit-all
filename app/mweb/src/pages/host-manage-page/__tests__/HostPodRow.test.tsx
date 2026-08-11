import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import HostPodRow from '../HostPodRow';

const basePod = (over: Record<string, unknown> = {}) => ({
  pod_id: 'pod-1',
  club_slug: 'club-x',
  pod_title: 'Sunset Yoga',
  pod_date_time: '2026-08-01T10:00:00.000Z',
  zone_name: 'North Zone',
  pod_type: 'FREE',
  venue_approval_status: 'APPROVED',
  ...over,
});

const renderRow = (pod: Record<string, unknown>, handlers: Record<string, () => void> = {}) => {
  const onScan = handlers.onScan ?? vi.fn();
  const onComplete = handlers.onComplete ?? vi.fn();
  const onEdit = handlers.onEdit ?? vi.fn();
  const onOpenFeedback = handlers.onOpenFeedback ?? vi.fn();
  const onShareFeedback = handlers.onShareFeedback ?? vi.fn();
  const onCopyFeedback = handlers.onCopyFeedback ?? vi.fn();
  const onCancel = handlers.onCancel ?? vi.fn();
  render(
    <MemoryRouter>
      <HostPodRow
        pod={pod}
        onScan={onScan}
        onComplete={onComplete}
        onEdit={onEdit}
        onOpenFeedback={onOpenFeedback}
        onShareFeedback={onShareFeedback}
        onCopyFeedback={onCopyFeedback}
        onCancel={onCancel}
      />
    </MemoryRouter>,
  );
  return { onScan, onComplete, onEdit, onOpenFeedback, onShareFeedback, onCopyFeedback, onCancel };
};

/** The actions moved behind an overflow menu, so each one needs it opened. */
const pickAction = (label: string) => {
  fireEvent.click(screen.getByLabelText('Actions for Sunset Yoga'));
  fireEvent.click(screen.getByText(label));
};

describe('HostPodRow', () => {
  it('renders title, zone, formatted date, and a link to the pod', () => {
    renderRow(basePod());
    expect(screen.getByText('Sunset Yoga')).toBeInTheDocument();
    expect(screen.getByText(/North Zone/)).toBeInTheDocument();
    const link = screen.getByText('Sunset Yoga').closest('a');
    expect(link).toHaveAttribute('href', '/club/club-x/pod/pod-1');
  });

  it('falls back to # link and dash date when slug/id/date are missing', () => {
    renderRow(basePod({ club_slug: null, pod_id: null, pod_date_time: null, zone_name: null }));
    const link = screen.getByText('Sunset Yoga').closest('a');
    // `to="#"` is resolved by the router to the current path, never the pod link.
    expect(link).not.toHaveAttribute('href', '/club/club-x/pod/pod-1');
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows dash for an invalid date value', () => {
    renderRow(basePod({ pod_date_time: 'not-a-date', zone_name: null }));
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders Paid for a paid pod', () => {
    // Pod types collapsed to FREE | PAID, so the chip is a plain label now —
    // there are no underscores left to replace.
    renderRow(basePod({ pod_type: 'PAID' }));
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders Free for a free pod', () => {
    renderRow(basePod({ pod_type: 'FREE' }));
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('fires the scan, complete, edit and cancel callbacks from the actions menu', () => {
    const { onScan, onComplete, onEdit, onCancel } = renderRow(basePod());
    pickAction('Scan attendee event tickets');
    pickAction('Complete pod');
    pickAction('Edit pod');
    pickAction('Cancel pod');
    expect(onScan).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows the pending approval chip for PENDING status', () => {
    renderRow(basePod({ venue_approval_status: 'PENDING' }));
    expect(screen.getByText('Venue Approval Pending')).toBeInTheDocument();
  });

  it('shows the rejected chip and resubmission note for DECLINED status', () => {
    renderRow(basePod({ venue_approval_status: 'DECLINED' }));
    expect(screen.getByText('Venue Rejected')).toBeInTheDocument();
    expect(screen.getByText(/Venue rejected your slot request/)).toBeInTheDocument();
  });

  it('does not render an approval chip for APPROVED status', () => {
    renderRow(basePod({ venue_approval_status: 'APPROVED' }));
    expect(screen.queryByText('Venue Rejected')).not.toBeInTheDocument();
    expect(screen.queryByText('Venue Approval Pending')).not.toBeInTheDocument();
  });
});
