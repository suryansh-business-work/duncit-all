import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HardDeleteDialog from './HardDeleteDialog';

describe('HardDeleteDialog', () => {
  it('enables Delete only once email + password are filled, then confirms', () => {
    const onConfirm = vi.fn();
    render(
      <HardDeleteDialog
        open
        entityLabel="venue"
        entityName="The Loft"
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByText('The Loft')).toBeInTheDocument();

    const del = screen.getByRole('button', { name: /delete permanently/i });
    expect(del).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^Your email/), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^Your password/), { target: { value: 'secret' } });
    expect(del).toBeEnabled();

    fireEvent.click(del);
    expect(onConfirm).toHaveBeenCalledWith('a@b.com', 'secret');
  });

  it('surfaces a server error message', () => {
    render(
      <HardDeleteDialog
        open
        entityLabel="brand"
        entityName="Acme"
        error="Password is incorrect"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText('Password is incorrect')).toBeInTheDocument();
  });

  it('shows a loading state that disables the fields and actions', () => {
    render(
      <HardDeleteDialog
        open
        entityLabel="host"
        entityName="Asha"
        loading
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
    expect(screen.getByLabelText(/^Your email/)).toBeDisabled();
    expect(screen.getByLabelText(/^Your password/)).toBeDisabled();
  });

  // Filled in, then submitted: the parent flips to loading and the button must
  // not take a second press while the delete is in flight.
  it('locks a filled-in form once the delete is in flight', () => {
    const props = {
      open: true,
      entityLabel: 'venue',
      entityName: 'The Loft',
      onClose: vi.fn(),
      onConfirm: vi.fn(),
    };
    const { rerender } = render(<HardDeleteDialog {...props} />);
    fireEvent.change(screen.getByLabelText(/^Your email/), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText(/^Your password/), { target: { value: 'secret' } });
    expect(screen.getByRole('button', { name: /delete permanently/i })).toBeEnabled();

    rerender(<HardDeleteDialog {...props} loading />);
    expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled();
  });

  it('falls back to a generic name and cancels/clears', () => {
    const onClose = vi.fn();
    render(
      <HardDeleteDialog open entityLabel="venue" entityName="" onClose={onClose} onConfirm={vi.fn()} />,
    );
    expect(screen.getByText('This venue')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });
});
