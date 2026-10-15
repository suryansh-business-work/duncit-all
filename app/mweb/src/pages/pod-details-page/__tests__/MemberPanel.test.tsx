import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MemberPanel from '../MemberPanel';

type Props = Parameters<typeof MemberPanel>[0];

const renderPanel = (over: Partial<Props> = {}) => {
  const onBackout = vi.fn();
  const onKeepSpot = vi.fn();
  const onCancelSpot = vi.fn();
  render(
    <MemberPanel
      isExpired={false}
      canBackout
      backingOut={false}
      releasedSeats={0}
      canTakeSeatsBack
      restoringSpot={false}
      onBackout={onBackout}
      onKeepSpot={onKeepSpot}
      onCancelSpot={onCancelSpot}
      {...over}
    />,
  );
  return { onBackout, onKeepSpot, onCancelSpot };
};

describe('MemberPanel — seats a partial backout gave back', () => {
  it('shows no released-seats row when nothing was released', () => {
    renderPanel();
    expect(screen.queryByTestId('pod-released-seats')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pod-released-seats-locked')).not.toBeInTheDocument();
  });

  it('names one released seat and lets the member take it back', () => {
    const { onKeepSpot } = renderPanel({ releasedSeats: 1 });
    expect(screen.getByTestId('pod-released-seats')).toHaveTextContent(
      'You released 1 seat — we are finding someone to fill it.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Take Seats Back' }));
    expect(onKeepSpot).toHaveBeenCalledTimes(1);
  });

  it('counts several released seats', () => {
    renderPanel({ releasedSeats: 3 });
    expect(screen.getByTestId('pod-released-seats')).toHaveTextContent(
      'You released 3 seats — we are finding someone to fill them.',
    );
  });

  it('disables "Take Seats Back" while the seats are being restored', () => {
    renderPanel({ releasedSeats: 2, restoringSpot: true });
    expect(screen.getByTestId('pod-take-seats-back')).toBeDisabled();
  });

  it('says the release is final, with no way back, once a replacement took the seats', () => {
    renderPanel({ releasedSeats: 2, canTakeSeatsBack: false });
    expect(screen.getByTestId('pod-released-seats-locked')).toHaveTextContent(
      'A replacement has been confirmed — this Backout request can no longer be cancelled.',
    );
    expect(screen.queryByTestId('pod-take-seats-back')).not.toBeInTheDocument();
  });
});

describe('MemberPanel — the way out of the pod', () => {
  it('offers Backout on a paid pod that still allows it', () => {
    const { onBackout } = renderPanel();
    expect(screen.queryByTestId('pod-cancel-spot')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pod-backout'));
    expect(onBackout).toHaveBeenCalledTimes(1);
  });

  it('offers Cancel Spot instead of Backout on a free pod', () => {
    const { onCancelSpot } = renderPanel({ isFree: true, canCancelSpot: true });
    expect(screen.queryByTestId('pod-backout')).not.toBeInTheDocument();
    const cancel = screen.getByTestId('pod-cancel-spot');
    expect(cancel).toHaveTextContent('Cancel Spot');
    fireEvent.click(cancel);
    expect(onCancelSpot).toHaveBeenCalledTimes(1);
  });
});
