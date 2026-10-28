import { screen } from '@testing-library/react';
import type { MockedResponse } from '@apollo/client/testing';
import { describe, expect, it, vi } from 'vitest';
import type { LitePublicSettings } from '../../../../../shared/graphql/documents';
import { LITE_UPI_QR, type LiteTicket } from '../../../../graphql/registrations';
import { PaymentPanel } from '../../../../pages/ticket/payment-panel';
import { meFixture, renderWithProviders, typed } from '../../../test-utils';
import { myTicketFixture, ticketEventFixture } from '../ticket-fixture';

const UPI = 'asha@okbank';

const qrMock = (name: string | null): MockedResponse => ({
  request: { query: LITE_UPI_QR, variables: { upi_id: UPI, name, amount: 500, note: 'Garden Party' } },
  result: { data: { liteUpiQr: typed('LiteUpiQr', { data_url: 'data:image/png;base64,UPIQR', upi_link: `upi://pay?pa=${UPI}&am=500` }) } },
});

/** A ₹500 ticket waiting for payment to a host with a UPI ID. */
const pending = (over: Partial<LiteTicket> = {}): LiteTicket =>
  myTicketFixture({
    status: 'PAYMENT_PENDING',
    amount_due: 500,
    payment_status: 'PENDING',
    event: ticketEventFixture({ upi_id: UPI, upi_name: 'Asha Rao' }),
    ...over,
  });

const renderPanel = (ticket: LiteTicket, mocks: MockedResponse[] = [], settings: Partial<LitePublicSettings> = {}) =>
  renderWithProviders(<PaymentPanel ticket={ticket} onChanged={vi.fn()} />, { me: meFixture(), mocks, settings });

describe('PaymentPanel', () => {
  it('asks for the amount due over UPI, with the payee, the copyable UPI ID and the QR', async () => {
    renderPanel(pending(), [qrMock('Asha Rao')]);

    expect(screen.getByText('Pay ₹500 over UPI')).toBeInTheDocument();
    expect(screen.getByTestId('payment-amount')).toHaveTextContent('₹500');
    expect(screen.getByText('Pay to Asha Rao')).toBeInTheDocument();
    expect(screen.getByTestId('payment-upi-id')).toHaveValue(UPI);
    expect(screen.getByRole('button', { name: 'Copy UPI ID' })).toBeInTheDocument();

    const qr = await screen.findByRole('img', { name: `UPI QR code for ${UPI}` });
    expect(qr).toHaveAttribute('src', 'data:image/png;base64,UPIQR');
    expect(screen.getByRole('link', { name: 'Open in UPI app' })).toHaveAttribute('href', `upi://pay?pa=${UPI}&am=500`);
  });

  it('shows a loader while the QR is being drawn', () => {
    renderPanel(pending(), [qrMock('Asha Rao')]);
    expect(screen.getByRole('status', { name: 'Loading…' })).toBeInTheDocument();
  });

  it('asks the QR without a payee name when the host gave none, and shows no "Pay to" line', async () => {
    renderPanel(pending({ event: ticketEventFixture({ upi_id: UPI, upi_name: null }) }), [qrMock(null)]);

    expect(await screen.findByTestId('upi-qr')).toBeInTheDocument();
    expect(screen.queryByText(/^Pay to/)).not.toBeInTheDocument();
  });

  it('tells the guest to contact the host when there is no UPI ID, without asking for a QR', () => {
    renderPanel(pending({ event: ticketEventFixture({ upi_id: null }) }));

    expect(screen.getByText('The host has not added a UPI ID yet. Contact them to pay.')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-upi-id')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the admin’s UPI help text when there is some', () => {
    renderPanel(pending({ event: ticketEventFixture({ upi_id: null }) }), [], { upi_help_text: 'Payments reach the host directly.' });
    expect(screen.getByText('Payments reach the host directly.')).toBeInTheDocument();
  });

  it('asks for the reference after paying when none was sent yet', () => {
    renderPanel(pending({ event: ticketEventFixture({ upi_id: null }) }));

    expect(screen.getByText('After paying')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-waiting')).not.toBeInTheDocument();
    expect(screen.getByTestId('payment-reference-form')).toBeInTheDocument();
  });

  it('confirms a sent reference is with the host and offers to send it again', () => {
    renderPanel(pending({ payment_reference: '412345678901', payment_note: 'From Asha', event: ticketEventFixture({ upi_id: null }) }));

    expect(screen.getByTestId('payment-waiting')).toHaveTextContent('Reference 412345678901 sent. The host will confirm your payment.');
    expect(screen.getByText('Sent the wrong reference? Send it again.')).toBeInTheDocument();
    expect(screen.getByTestId('payment-reference')).toHaveValue('412345678901');
    expect(screen.getByTestId('payment-note')).toHaveValue('From Asha');
  });

  it('tells the guest a rejected reference did not match, and asks again', () => {
    renderPanel(pending({ payment_status: 'REJECTED', payment_reference: '412345678901', event: ticketEventFixture({ upi_id: null }) }));

    expect(screen.getByText('The host could not match your last reference. Check it and send it again.')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-waiting')).not.toBeInTheDocument();
    expect(screen.getByText('After paying')).toBeInTheDocument();
  });
});
