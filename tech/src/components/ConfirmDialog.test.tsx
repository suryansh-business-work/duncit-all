import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('is not rendered when closed', () => {
    render(<ConfirmDialog open={false} title="T" onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.queryByText('T')).toBeNull();
  });

  it('renders a string message and default labels, wiring confirm/cancel', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Delete?" message="Are you sure" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByText('Are you sure')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('renders a ReactNode message and custom destructive labels', () => {
    render(
      <ConfirmDialog
        open
        title="X"
        message={<span data-testid="node-msg">node</span>}
        confirmLabel="Yes"
        cancelLabel="No"
        destructive
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByTestId('node-msg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument();
  });

  it('disables actions and shows a spinner while busy', () => {
    render(<ConfirmDialog open title="X" busy onConfirm={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });
});
