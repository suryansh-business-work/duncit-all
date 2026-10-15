import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CancelSpotButton from '../PodHistoryActions/CancelSpotButton';

const LIMIT_REACHED =
  'You have cancelled your spot on this pod the maximum number of times allowed, so it can no longer be cancelled.';

describe('CancelSpotButton', () => {
  it('fires the cancel while cancellations are left, with no tooltip', () => {
    const onCancelSpot = vi.fn();
    render(<CancelSpotButton disabled={false} maxed={false} label="Cancel Spot" onCancelSpot={onCancelSpot} />);
    const button = screen.getByRole('button', { name: 'Cancel Spot' });
    expect(button).toBeEnabled();
    fireEvent.click(button);
    expect(onCancelSpot).toHaveBeenCalledTimes(1);
    fireEvent.mouseOver(button);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('is disabled by its caller (a booking that is not JOINED, or a cancel in flight)', () => {
    const onCancelSpot = vi.fn();
    render(<CancelSpotButton disabled maxed={false} label="Cancelling…" onCancelSpot={onCancelSpot} />);
    const button = screen.getByTestId('ph-cancel-spot');
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent('Cancelling…');
    fireEvent.click(button);
    expect(onCancelSpot).not.toHaveBeenCalled();
  });

  it('stays visible but disabled at the limit, and says why on hover', async () => {
    const onCancelSpot = vi.fn();
    render(<CancelSpotButton disabled={false} maxed label="Cancel Spot" onCancelSpot={onCancelSpot} />);
    const button = screen.getByTestId('ph-cancel-spot');
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onCancelSpot).not.toHaveBeenCalled();

    // A disabled button fires no pointer events — the wrapper carries the tooltip.
    const wrapper = button.parentElement as HTMLElement;
    expect(wrapper.tagName).toBe('SPAN');
    fireEvent.mouseOver(wrapper);
    expect(await screen.findByRole('tooltip')).toHaveTextContent(LIMIT_REACHED);
  });
});
