import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PodParticipationInput } from '@duncit/utils';
import { PodParticipationTimeline } from '../src/PodParticipationTimeline';

const NOW = new Date('2026-08-20T10:00:00.000Z');
const formatDateTime = (value: string) => `at:${value}`;

const openPartialBackout: PodParticipationInput = {
  joinedAt: '2026-08-01T09:00:00.000Z',
  podDateTime: '2026-09-05T18:00:00.000Z',
  backouts: [
    {
      backout_no: 'DUN-BKO-0042',
      status: 'IN_PROCESS',
      attempt_no: 1,
      seats: 1,
      seats_before: 4,
      created_at: '2026-08-10T12:00:00.000Z',
    },
  ],
  now: NOW,
};

describe('PodParticipationTimeline', () => {
  it('draws the joined node with its formatted time and no in-progress chip', () => {
    render(
      <PodParticipationTimeline
        input={{ joinedAt: '2026-08-01T09:00:00.000Z', podDateTime: null, now: NOW }}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('Pod Joined')).toBeInTheDocument();
    expect(screen.getByText('at:2026-08-01T09:00:00.000Z')).toBeInTheDocument();
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
  });

  it('nests an open backout under the request, with the DUN-BKO id and an in-progress chip', () => {
    render(
      <PodParticipationTimeline input={openPartialBackout} formatDateTime={formatDateTime} />,
    );
    expect(screen.getByText('Partial Backout Requested')).toBeInTheDocument();
    expect(screen.getByText('You released 1 of 4 seats and kept 3.')).toBeInTheDocument();
    expect(screen.getByText('Finding Your Replacement')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();

    // The id chip appears once, on the request itself — the child node carries
    // the same backoutNo but is not the request line.
    const idChip = screen.getByText('DUN-BKO-0042').closest('.MuiChip-root');
    expect(idChip).toHaveClass('MuiChip-outlined', 'MuiChip-colorDefault');
    expect(screen.getAllByText('DUN-BKO-0042')).toHaveLength(1);
  });

  it('fills the id chip in primary when the screen is about that request', () => {
    render(
      <PodParticipationTimeline
        input={openPartialBackout}
        formatDateTime={formatDateTime}
        highlightBackoutNo="DUN-BKO-0042"
      />,
    );
    const idChip = screen.getByText('DUN-BKO-0042').closest('.MuiChip-root');
    expect(idChip).toHaveClass('MuiChip-filled', 'MuiChip-colorPrimary');
  });

  it('keeps the id chip outlined when the highlighted request is another one', () => {
    render(
      <PodParticipationTimeline
        input={openPartialBackout}
        formatDateTime={formatDateTime}
        highlightBackoutNo="DUN-BKO-0099"
      />,
    );
    const idChip = screen.getByText('DUN-BKO-0042').closest('.MuiChip-root');
    expect(idChip).toHaveClass('MuiChip-outlined');
  });

  it('draws a cancellation branch three levels deep and skips the time when none is known', () => {
    const formatSpy = vi.fn(formatDateTime);
    render(
      <PodParticipationTimeline
        input={{
          joinedAt: '2026-08-01T09:00:00.000Z',
          podDateTime: '2026-09-05T18:00:00.000Z',
          cancelledBy: 'HOST',
          cancelledAt: null,
          cancelRefundStatus: 'PROCESSED',
          now: NOW,
        }}
        formatDateTime={formatSpy}
      />,
    );
    expect(screen.getByText('Pod Cancelled')).toBeInTheDocument();
    expect(screen.getByText('The pod was cancelled by the host.')).toBeInTheDocument();
    expect(screen.getByText('Refund Initiated')).toBeInTheDocument();
    // Only the joined node knows when it happened.
    expect(formatSpy).toHaveBeenCalledTimes(1);
    expect(formatSpy).toHaveBeenCalledWith('2026-08-01T09:00:00.000Z');
  });

  it('runs the attendance flow once the pod is past', () => {
    render(
      <PodParticipationTimeline
        input={{
          joinedAt: '2026-08-01T09:00:00.000Z',
          podDateTime: '2026-08-15T18:00:00.000Z',
          attended: false,
          attendanceRecorded: true,
          now: NOW,
        }}
        formatDateTime={formatDateTime}
      />,
    );
    expect(screen.getByText('Pod Date Arrives')).toBeInTheDocument();
    expect(screen.getByText('Pod Not Attended')).toBeInTheDocument();
    expect(screen.getByText('You did not attend the pod.')).toBeInTheDocument();
  });
});
