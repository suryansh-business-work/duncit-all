import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CancelSpotDialog from '../CancelSpotDialog';

describe('CancelSpotDialog', () => {
  const baseProps = { open: true, busy: false, onClose: vi.fn(), onConfirm: vi.fn() };

  it('renders nothing when closed', () => {
    render(<CancelSpotDialog {...baseProps} open={false} />);
    expect(screen.queryByText('Cancel your spot?')).not.toBeInTheDocument();
  });

  it('says the spot is released and can be joined again — and nothing about a refund', () => {
    render(<CancelSpotDialog {...baseProps} />);
    const dialog = screen.getByRole('dialog', { name: 'Cancel your spot?' });
    expect(dialog).toHaveTextContent(
      'Your spot will be released for someone else. This pod is free, so you can join again any time while it is open.',
    );
    expect(dialog).not.toHaveTextContent(/refund|deduction|attempt/i);
  });

  it('confirms or keeps the spot', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<CancelSpotDialog {...baseProps} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('cancel-spot-keep'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel My Spot' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  describe('the cancellations left (Pod Settings cap)', () => {
    it('says nothing about a cap while the counters are unknown or the pod has none', () => {
      const { rerender } = render(<CancelSpotDialog {...baseProps} />);
      expect(screen.queryByTestId('cancel-spot-limit-hint')).not.toBeInTheDocument();
      rerender(<CancelSpotDialog {...baseProps} cancels={null} />);
      expect(screen.queryByTestId('cancel-spot-limit-hint')).not.toBeInTheDocument();
      // A max of 0 is a pod with no Cancel Spot to count.
      rerender(<CancelSpotDialog {...baseProps} cancels={{ spot_cancels_used: 0, spot_cancels_max: 0 }} />);
      expect(screen.queryByTestId('cancel-spot-limit-hint')).not.toBeInTheDocument();
    });

    it('names how many cancellations are left', () => {
      render(<CancelSpotDialog {...baseProps} cancels={{ spot_cancels_used: 1, spot_cancels_max: 4 }} />);
      expect(screen.getByTestId('cancel-spot-limit-hint')).toHaveTextContent(
        'You can cancel your spot on this pod 3 more times.',
      );
    });

    it('warns when this is the last cancellation', () => {
      render(<CancelSpotDialog {...baseProps} cancels={{ spot_cancels_used: 2, spot_cancels_max: 3 }} />);
      expect(screen.getByTestId('cancel-spot-limit-hint')).toHaveTextContent(
        'You can cancel your spot on this pod one more time. If you join again after that, the spot cannot be cancelled.',
      );
    });

    it('says the limit is reached once every cancellation is used', () => {
      render(<CancelSpotDialog {...baseProps} cancels={{ spot_cancels_used: 5, spot_cancels_max: 3 }} />);
      expect(screen.getByTestId('cancel-spot-limit-hint')).toHaveTextContent(
        'You have cancelled your spot on this pod the maximum number of times allowed, so it can no longer be cancelled.',
      );
    });
  });

  it('locks both buttons and says it is cancelling while busy', () => {
    render(<CancelSpotDialog {...baseProps} busy />);
    expect(screen.getByTestId('cancel-spot-keep')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
  });
});
