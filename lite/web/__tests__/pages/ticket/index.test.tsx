import { screen, waitFor, within } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import { LITE_REGISTRATION, LITE_UPI_QR, type LiteTicket } from '../../../graphql/registrations';
import { TicketPage } from '../../../pages/ticket';
import { meFixture, renderWithProviders, typed } from '../../test-utils';
import { myTicketFixture, ticketEventFixture } from './ticket-fixture';

const ticketMock = (liteRegistration: LiteTicket | null): MockedResponse => ({
  request: { query: LITE_REGISTRATION, variables: { id: 'reg-1' } },
  result: { data: { liteRegistration } },
});

const renderPage = (mocks: MockedResponse[], signedIn = true) =>
  renderWithProviders(<TicketPage />, { route: '/tickets/reg-1', path: '/tickets/:id', mocks, me: signedIn ? meFixture() : null });

describe('TicketPage', () => {
  it('asks a signed-out reader to sign in first', () => {
    renderPage([], false);

    expect(screen.getByTestId('signed-in-gate')).toHaveTextContent('Sign in to see the events you registered for.');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('shows the ticket: the event and its time on the host’s clock, the check-in code, the status and the event card', async () => {
    renderPage([ticketMock(myTicketFixture({ qr_data_url: 'data:image/png;base64,TICKETQR' }))]);

    expect(await screen.findByTestId('ticket-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Garden Party' })).toBeInTheDocument();
    expect(within(screen.getByTestId('page-header')).getByText('Sat, 21 Nov 2026 · 7:00 PM – 9:30 PM')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Check-in QR code for ticket ABC123' })).toBeInTheDocument();
    expect(screen.getByTestId('registration-status-chip')).toHaveTextContent('Going');
    expect(screen.getByRole('heading', { level: 2, name: 'Event' })).toBeInTheDocument();
    expect(within(screen.getByTestId('event-card')).getByRole('link')).toHaveAttribute('href', '/e/garden-party');
    expect(screen.queryByTestId('payment-panel')).not.toBeInTheDocument();
  });

  it('titles the tab with the event the ticket is for', async () => {
    renderPage([ticketMock(myTicketFixture())]);
    await screen.findByTestId('ticket-page');
    await waitFor(() => expect(document.title).toBe('Ticket · Garden Party | Duncit Lite'));
  });

  it('puts the payment step on a ticket that is waiting for payment', async () => {
    const ticket = myTicketFixture({ status: 'PAYMENT_PENDING', amount_due: 500, payment_status: 'PENDING', event: ticketEventFixture({ upi_id: 'asha@okbank', upi_name: null }) });
    renderPage([
      ticketMock(ticket),
      {
        request: { query: LITE_UPI_QR, variables: { upi_id: 'asha@okbank', name: null, amount: 500, note: 'Garden Party' } },
        result: { data: { liteUpiQr: typed('LiteUpiQr', { data_url: 'data:image/png;base64,UPIQR', upi_link: 'upi://pay?pa=asha@okbank' }) } },
      },
    ]);

    expect(await screen.findByTestId('payment-panel')).toBeInTheDocument();
    expect(screen.getByText('Pay ₹500 over UPI')).toBeInTheDocument();
    // No code to show at the door until the host confirms the payment.
    expect(screen.queryByTestId('check-in-code')).not.toBeInTheDocument();
    expect(screen.getByTestId('check-in-locked')).toHaveTextContent('Your check-in code and QR will show here once your payment is done and the host confirms it.');
  });

  it('shows the not-found page for a ticket that is not the reader’s', async () => {
    renderPage([ticketMock(null)]);
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('ticket-page')).not.toBeInTheDocument();
  });

  it('shows the API error when the ticket cannot be read', async () => {
    renderPage([{ request: { query: LITE_REGISTRATION, variables: { id: 'reg-1' } }, result: { errors: [{ message: 'Ticket service unavailable' }] } }]);
    expect(await screen.findByTestId('query-guard-error')).toHaveTextContent('Ticket service unavailable');
  });
});
