import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { PodBookingClash } from '@duncit/utils';
import BookingClashDialog from '../BookingClashDialog';

const clash = (over: Partial<PodBookingClash> = {}): PodBookingClash => ({
  target_pod_id: 'target',
  pod_id: 'booked-1',
  pod_slug: 'friday-jam',
  club_slug: 'jazz-club',
  pod_title: 'Friday Jam',
  pod_date_time: '2026-11-06T13:30:00.000Z',
  pod_end_date_time: '2026-11-06T15:30:00.000Z',
  ...over,
});

const renderDialog = (pods: PodBookingClash[], answer = vi.fn()) => {
  render(
    <MemoryRouter>
      <BookingClashDialog guard={{ pods, answer }} />
    </MemoryRouter>,
  );
  return answer;
};

describe('BookingClashDialog', () => {
  it('stays closed when nothing clashes', () => {
    renderDialog([]);
    expect(screen.queryByTestId('booking-clash-dialog')).not.toBeInTheDocument();
  });

  it('lists every clashing pod with its time and a link to free that spot, plus the recommendation', () => {
    renderDialog([clash(), clash({ pod_id: 'booked-2', pod_title: 'Saturday Run', pod_slug: 'saturday-run' })]);
    const dialog = screen.getByRole('dialog', { name: 'You already have 2 pods at this time' });
    expect(dialog).toHaveTextContent('Friday Jam');
    expect(dialog).toHaveTextContent('Saturday Run');
    expect(screen.getByTestId('booking-clash-open-booked-1')).toHaveAttribute('href', '/club/jazz-club/pod/friday-jam');
    expect(screen.getByTestId('booking-clash-advice')).toHaveTextContent(/freeing your spot on the clashing pod first/);
  });

  it('uses the singular title for one clash', () => {
    renderDialog([clash()]);
    expect(screen.getByRole('dialog', { name: 'You already have a pod at this time' })).toBeInTheDocument();
  });

  it('offers no link for a pod that has lost its club, rather than a broken one', () => {
    renderDialog([clash({ club_slug: '' })]);
    expect(screen.queryByTestId('booking-clash-open-booked-1')).not.toBeInTheDocument();
  });

  it('Force book answers yes; Cancel booking answers no', () => {
    const answer = renderDialog([clash()]);
    fireEvent.click(screen.getByTestId('booking-clash-force'));
    expect(answer).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByTestId('booking-clash-cancel'));
    expect(answer).toHaveBeenLastCalledWith(false);
  });

  it('cancels this booking when the member leaves to open the clashing pod', () => {
    const answer = renderDialog([clash()]);
    fireEvent.click(screen.getByTestId('booking-clash-open-booked-1'));
    expect(answer).toHaveBeenCalledWith(false);
  });
});
