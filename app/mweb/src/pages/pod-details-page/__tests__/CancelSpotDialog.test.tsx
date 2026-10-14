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

  it('locks both buttons and says it is cancelling while busy', () => {
    render(<CancelSpotDialog {...baseProps} busy />);
    expect(screen.getByTestId('cancel-spot-keep')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();
  });
});
