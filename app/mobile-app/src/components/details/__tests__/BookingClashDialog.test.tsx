import { fireEvent, screen } from '@testing-library/react-native';
import type { PodBookingClash } from '@duncit/utils';

import { BookingClashDialog } from '@/components/details/BookingClashDialog';
import { renderWithProviders } from '@/utils/test-utils';

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

const renderDialog = (pods: PodBookingClash[]) => {
  const answer = jest.fn();
  const onOpenPod = jest.fn();
  renderWithProviders(<BookingClashDialog guard={{ pods, answer }} onOpenPod={onOpenPod} />);
  return { answer, onOpenPod };
};

describe('BookingClashDialog', () => {
  it('stays closed when nothing clashes', () => {
    renderDialog([]);
    expect(screen.queryByText('Friday Jam')).toBeNull();
  });

  it('lists every clashing pod, the recommendation, and both choices', () => {
    renderDialog([clash(), clash({ pod_id: 'booked-2', pod_title: 'Saturday Run' })]);
    expect(screen.getByText('You already have 2 pods at this time')).toBeOnTheScreen();
    expect(screen.getByText('Friday Jam')).toBeOnTheScreen();
    expect(screen.getByText('Saturday Run')).toBeOnTheScreen();
    expect(screen.getByTestId('booking-clash-advice')).toHaveTextContent(
      /freeing your spot on the clashing pod first/,
    );
    expect(screen.getByText('Force book')).toBeOnTheScreen();
  });

  it('Force book answers yes; Cancel booking answers no', () => {
    const { answer } = renderDialog([clash()]);
    fireEvent.press(screen.getByTestId('booking-clash-force'));
    expect(answer).toHaveBeenLastCalledWith(true);
    fireEvent.press(screen.getByTestId('booking-clash-cancel'));
    expect(answer).toHaveBeenLastCalledWith(false);
  });

  it('opening a clashing pod cancels this booking and goes to that pod', () => {
    const { answer, onOpenPod } = renderDialog([clash()]);
    fireEvent.press(screen.getByTestId('booking-clash-open-booked-1'));
    expect(answer).toHaveBeenCalledWith(false);
    expect(onOpenPod).toHaveBeenCalledWith('jazz-club', 'friday-jam');
  });

  it('offers no link for a pod that has lost its club', () => {
    renderDialog([clash({ club_slug: '' })]);
    expect(screen.queryByTestId('booking-clash-open-booked-1')).toBeNull();
  });
});
