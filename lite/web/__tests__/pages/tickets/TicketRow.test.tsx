import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TicketRow } from '../../../pages/tickets/TicketRow';
import { renderWithProviders } from '../../test-utils';
import { myTicketFixture } from '../ticket/ticket-fixture';

describe('TicketRow', () => {
  it('links the whole row to the ticket page', () => {
    renderWithProviders(<TicketRow ticket={myTicketFixture()} />);
    expect(screen.getByTestId('ticket-row')).toHaveAttribute('href', '/tickets/reg-1');
  });

  it('names the event, its time on the host’s clock and the ticket bought', () => {
    renderWithProviders(<TicketRow ticket={myTicketFixture({ quantity: 2, code: 'XYZ789' })} />);

    expect(screen.getByText('Garden Party')).toBeInTheDocument();
    expect(screen.getByText('Sat, 21 Nov 2026 · 7:00 PM – 9:30 PM')).toBeInTheDocument();
    expect(screen.getByText('General × 2 · XYZ789')).toBeInTheDocument();
    expect(screen.getByTestId('registration-status-chip')).toHaveTextContent('Going');
  });

  it('shows the payment state only for a paid ticket', () => {
    const { unmount } = renderWithProviders(<TicketRow ticket={myTicketFixture({ payment_status: 'NOT_REQUIRED' })} />);
    expect(screen.queryByTestId('payment-status-chip')).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<TicketRow ticket={myTicketFixture({ status: 'CONFIRMED', amount_due: 500, payment_status: 'PAID' })} />);
    expect(screen.getByTestId('payment-status-chip')).toHaveTextContent('Paid');
  });
});
