import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GuestsTable } from '../../../../pages/manage/guests/GuestsTable';
import { registrationFixture, renderWithProviders } from '../../../test-utils';

describe('GuestsTable and GuestRow', () => {
  it('is a named table with a column for each fact and one for actions', () => {
    renderWithProviders(<GuestsTable guests={[]} onAction={vi.fn()} />);

    const table = screen.getByRole('table', { name: 'Guest list' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent);
    expect(headers).toEqual(['Guest', 'Ticket', 'Status', 'Payment', 'Code', 'Checked in', 'Actions']);
  });

  it('shows who the guest is, their ticket, status, payment, code and check-in time', () => {
    const guest = registrationFixture({
      quantity: 2,
      status: 'CONFIRMED',
      payment_status: 'PAID',
      payment_reference: 'UTR 4455',
      checked_in_at: '2026-11-21T14:00:00.000Z',
    });
    renderWithProviders(<GuestsTable guests={[guest]} onAction={vi.fn()} />);

    const row = screen.getByTestId('guest-row');
    expect(within(row).getByText('Ravi Kumar')).toBeInTheDocument();
    expect(within(row).getByText('ravi@example.com')).toBeInTheDocument();
    expect(row).toHaveTextContent('General × 2');
    expect(within(row).getByTestId('registration-status-chip')).toHaveTextContent('Going');
    expect(within(row).getByTestId('payment-status-chip')).toHaveTextContent('Paid');
    expect(within(row).getByText('UTR 4455')).toBeInTheDocument();
    expect(within(row).getByText('ABC123')).toBeInTheDocument();
    // In the console's zone (Asia/Kolkata) and formats, whatever the device's zone.
    expect(row).toHaveTextContent('21 Nov 2026 · 07:30 PM');
  });

  it('shows a dash for a guest not yet checked in', () => {
    renderWithProviders(<GuestsTable guests={[registrationFixture()]} onAction={vi.fn()} />);

    const cells = within(screen.getByTestId('guest-row')).getAllByRole('cell');
    expect(cells[5]).toHaveTextContent('—');
  });

  it('opens the actions menu for the guest and passes the chosen action back', async () => {
    const onAction = vi.fn();
    const guest = registrationFixture();
    const { user } = renderWithProviders(<GuestsTable guests={[guest]} onAction={onAction} />);

    const trigger = screen.getByRole('button', { name: 'Actions for Ravi Kumar' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const menu = screen.getByRole('menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const controlled = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
    expect(controlled).toContainElement(menu);
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['Check in', 'Remove']);

    await user.click(within(menu).getByRole('menuitem', { name: 'Check in' }));

    expect(onAction).toHaveBeenCalledWith(guest, 'CHECK_IN');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('offers undo for a guest already checked in', async () => {
    const { user } = renderWithProviders(<GuestsTable guests={[registrationFixture({ checked_in_at: '2026-11-21T14:00:00.000Z' })]} onAction={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Actions for Ravi Kumar' }));

    expect(screen.getByRole('menuitem', { name: 'Undo check-in' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Check in' })).not.toBeInTheDocument();
  });

  it('has no actions button for a cancelled registration', () => {
    renderWithProviders(<GuestsTable guests={[registrationFixture({ status: 'CANCELLED' })]} onAction={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Actions for Ravi Kumar' })).not.toBeInTheDocument();
    expect(screen.getByTestId('registration-status-chip')).toHaveTextContent('Cancelled');
  });

  it('renders one row per guest', () => {
    renderWithProviders(<GuestsTable guests={[registrationFixture(), registrationFixture({ id: 'reg-2', code: 'XYZ789' })]} onAction={vi.fn()} />);

    expect(screen.getAllByTestId('guest-row')).toHaveLength(2);
  });
});
