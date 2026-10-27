import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecipientDialog } from '../../../components/recipient-dialog';

interface Overrides {
  open?: boolean;
  busy?: boolean;
  defaultTo?: string;
  onSubmit?: (to: string) => Promise<void> | void;
  onClose?: () => void;
}

const dialog = ({ open = true, busy, defaultTo = 'asha@lite.example', onSubmit = vi.fn(), onClose = vi.fn() }: Overrides = {}) => (
  <RecipientDialog open={open} title="Send a test email" message="A real message goes out." defaultTo={defaultTo} busy={busy} onClose={onClose} onSubmit={onSubmit} testId="rcpt" />
);

describe('RecipientDialog', () => {
  it('opens pre-filled with the default address under its title and message', () => {
    render(dialog());
    expect(screen.getByRole('dialog', { name: 'Send a test email' })).toBeInTheDocument();
    expect(screen.getByText('A real message goes out.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Send to/)).toHaveValue('asha@lite.example');
    expect(screen.getByText('The address that receives the test message')).toBeInTheDocument();
    expect(screen.getByTestId('rcpt-submit')).toHaveTextContent('Send');
  });

  it('sends the typed address lowercased', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(dialog({ onSubmit }));
    const box = screen.getByTestId('rcpt-to');
    await user.clear(box);
    await user.type(box, 'Ops@Lite.Example');
    await user.click(screen.getByTestId('rcpt-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('ops@lite.example'));
  });

  it('refuses a bad address with the message under the box and does not send', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(dialog({ onSubmit, defaultTo: '' }));
    await user.type(screen.getByTestId('rcpt-to'), 'not-an-address');
    await user.click(screen.getByTestId('rcpt-submit'));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByTestId('rcpt-to')).toHaveAttribute('aria-invalid', 'true');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('asks for an address when the box is empty', async () => {
    const user = userEvent.setup();
    render(dialog({ defaultTo: '' }));
    await user.click(screen.getByTestId('rcpt-submit'));
    expect(await screen.findByText('Send to is required')).toBeInTheDocument();
  });

  it('shows Sending… and locks the box while busy', () => {
    render(dialog({ busy: true }));
    expect(screen.getByTestId('rcpt-submit')).toHaveTextContent('Sending…');
    expect(screen.getByTestId('rcpt-to')).toBeDisabled();
  });

  it('resets to the default address every time it reopens', async () => {
    const user = userEvent.setup();
    const { rerender } = render(dialog());
    const box = screen.getByTestId('rcpt-to');
    await user.clear(box);
    await user.type(box, 'someone@else.example');
    rerender(dialog({ open: false }));
    rerender(dialog({ open: true, defaultTo: 'owner@lite.example' }));
    await waitFor(() => expect(screen.getByTestId('rcpt-to')).toHaveValue('owner@lite.example'));
  });
});
