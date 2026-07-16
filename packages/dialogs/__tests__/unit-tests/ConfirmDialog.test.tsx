import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../../src/ConfirmDialog';

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
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('accepts the loading alias and swaps the label when busyLabel is set (no spinner)', () => {
    render(
      <ConfirmDialog
        open
        title="X"
        message="m"
        confirmLabel="Deactivate"
        busyLabel="Working…"
        loading
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Working…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('applies an explicit confirmColor over destructive', () => {
    render(
      <ConfirmDialog open title="X" confirmColor="warning" destructive onConfirm={vi.fn()} onClose={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Confirm' }).className).toContain('MuiButton-containedWarning');
  });

  it('falls back to the onCancel alias when onClose is not provided', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog open title="X" onConfirm={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
