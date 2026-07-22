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
  pod_type: 'FREE_POD',
  venue_approval_status: 'APPROVED',
  ...over,
});

const renderRow = (pod: Record<string, unknown>, handlers: Record<string, () => void> = {}) => {
  const onComplete = handlers.onComplete ?? vi.fn();
  const onEdit = handlers.onEdit ?? vi.fn();
  const onDelete = handlers.onDelete ?? vi.fn();
  render(
    <MemoryRouter>
      <HostPodRow pod={pod} onComplete={onComplete} onEdit={onEdit} onDelete={onDelete} />
    </MemoryRouter>,
  );
  return { onComplete, onEdit, onDelete };
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

  it('renders the pod type chip with underscores replaced', () => {
    renderRow(basePod({ pod_type: 'PAID_POD' }));
    expect(screen.getByText('PAID POD')).toBeInTheDocument();
  });

  it('fires the complete, edit and delete callbacks', () => {
    const { onComplete, onEdit, onDelete } = renderRow(basePod());
    fireEvent.click(screen.getByLabelText('Complete pod'));
    fireEvent.click(screen.getByLabelText('Edit pod'));
    fireEvent.click(screen.getByLabelText('Delete pod'));
    expect(onComplete).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledOnce();
    expect(onDelete).toHaveBeenCalledOnce();
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
