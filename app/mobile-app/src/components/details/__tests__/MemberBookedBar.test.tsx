import { fireEvent, screen } from '@testing-library/react-native';

import { MemberBookedBar } from '@/components/details/MemberBookedBar';
import { renderWithProviders } from '@/utils/test-utils';

const renderBar = (props: Partial<Parameters<typeof MemberBookedBar>[0]> = {}) =>
  renderWithProviders(
    <MemberBookedBar
      canBackout
      isExpired={false}
      releasedSeats={0}
      canTakeSeatsBack
      restoringSpot={false}
      onBackout={jest.fn()}
      onKeepSpot={jest.fn()}
      {...props}
    />,
  );

describe('MemberBookedBar', () => {
  it('shows a booked paid pod with Backout and no released seats', () => {
    const onBackout = jest.fn();
    renderBar({ onBackout });

    expect(screen.getByTestId('pod-booked-label')).toHaveTextContent('Pod Booked');
    expect(screen.queryByTestId('pod-released-seats')).toBeNull();
    expect(screen.queryByTestId('pod-released-seats-locked')).toBeNull();
    expect(screen.queryByTestId('pod-cancel-spot')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-backout'));
    expect(onBackout).toHaveBeenCalledTimes(1);
  });

  it('names one released seat and lets the member take it back', () => {
    const onKeepSpot = jest.fn();
    renderBar({ releasedSeats: 1, onKeepSpot });

    expect(screen.getByTestId('pod-released-seats')).toHaveTextContent(
      'You released 1 seat — we are finding someone to fill it.',
      { exact: false },
    );
    const takeBack = screen.getByTestId('pod-take-seats-back');
    expect(takeBack).toHaveProp('aria-disabled', false);
    fireEvent.press(takeBack);
    expect(onKeepSpot).toHaveBeenCalledTimes(1);
  });

  it('counts several released seats', () => {
    renderBar({ releasedSeats: 3 });

    expect(screen.getByTestId('pod-released-seats')).toHaveTextContent(
      'You released 3 seats — we are finding someone to fill them.',
      { exact: false },
    );
  });

  it('holds the take-back while a restore is already in flight', () => {
    const onKeepSpot = jest.fn();
    renderBar({ releasedSeats: 2, restoringSpot: true, onKeepSpot });

    const takeBack = screen.getByTestId('pod-take-seats-back');
    expect(takeBack).toHaveProp('aria-disabled', true);
    fireEvent.press(takeBack);
    expect(onKeepSpot).not.toHaveBeenCalled();
  });

  it('locks the released seats once a replacement has taken them', () => {
    renderBar({ releasedSeats: 2, canTakeSeatsBack: false });

    expect(screen.getByTestId('pod-released-seats-locked')).toHaveTextContent(
      'A replacement has been confirmed',
      { exact: false },
    );
    expect(screen.queryByTestId('pod-take-seats-back')).toBeNull();
  });

  it('says the attempts are spent, with no Backout, once they are', () => {
    renderBar({ canBackout: false });

    expect(screen.getByTestId('pod-backout-maxed')).toHaveTextContent(
      'You have reached the maximum number of Backout attempts allowed for this Pod.',
    );
    expect(screen.queryByTestId('pod-backout')).toBeNull();
  });

  it('marks a pod that already happened as visited', () => {
    renderBar({ isExpired: true, canBackout: false });

    expect(screen.getByTestId('pod-booked-label')).toHaveTextContent('Pod Visited');
  });

  it('offers Cancel Spot instead of Backout on a free pod', () => {
    const onCancelSpot = jest.fn();
    renderBar({ isFree: true, canCancelSpot: true, onCancelSpot });

    expect(screen.queryByTestId('pod-backout')).toBeNull();
    fireEvent.press(screen.getByTestId('pod-cancel-spot'));
    expect(onCancelSpot).toHaveBeenCalledTimes(1);
  });

  it('shows no Cancel Spot on a free pod without a handler for it', () => {
    renderBar({ isFree: true, canCancelSpot: true });

    expect(screen.queryByTestId('pod-cancel-spot')).toBeNull();
    expect(screen.queryByTestId('pod-backout')).toBeNull();
  });
});
