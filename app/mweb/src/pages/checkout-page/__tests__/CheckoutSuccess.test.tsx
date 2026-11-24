import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { logs } from '@duncit/logs';
import CheckoutSuccess from '../CheckoutSuccess';
import { INVOICE_PDF, MY_TICKET_FOR_POD, TICKET_PDF, TICKET_WALLET_LINKS } from '../CheckoutSuccess/queries';

// The confetti plays a lottie over the page; nothing here is about it.
vi.mock('../../../components/ConfettiOverlay', () => ({ default: () => null }));
// Dates are formatted by the admin-configured zone; a fixed formatter keeps the
// assertions independent of the machine running them.
vi.mock('../../../utils/dateFormat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../utils/dateFormat')>()),
  useDateFormat: () => ({ formatDateTime: (d: string) => `when:${d}` }),
}));

const payment = (over: Record<string, unknown> = {}) => ({
  id: 'pay-doc-1',
  total: 1180,
  currency_symbol: '₹',
  payment_id: 'pay_ABC123',
  invoice_no: 'INV/2026/0042',
  paid_at: null,
  created_at: null,
  ...over,
});

const pod = (over: Record<string, unknown> = {}) => ({
  id: 'pod-doc-1',
  pod_title: 'Sunset Jam',
  pod_date_time: '2026-08-01T10:00:00.000Z',
  pod_end_date_time: '2026-08-01T12:00:00.000Z',
  place_charges: [],
  ...over,
});

interface RenderOpts {
  payment?: Record<string, unknown>;
  pod?: Record<string, unknown> | null;
  mocks?: MockedResponse[];
  profileLabel?: string;
}

function renderSuccess(opts: RenderOpts = {}) {
  const onHome = vi.fn();
  const onProfile = vi.fn();
  render(
    <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={opts.mocks ?? []}>
      <CheckoutSuccess
        payment={opts.payment ?? payment()}
        pod={opts.pod === null ? undefined : (opts.pod ?? pod())}
        onHome={onHome}
        onProfile={onProfile}
        profileLabel={opts.profileLabel}
      />
    </MockedProvider>,
  );
  return { onHome, onProfile };
}

let downloads: Array<{ href: string; download: string }>;

const walletLinks = (links: { apple_pass_url: string | null; google_save_url: string | null }): MockedResponse => ({
  request: { query: TICKET_WALLET_LINKS, variables: { podId: 'pod-doc-1' } },
  result: { data: { myEventTicketWalletLinks: { __typename: 'EventTicketWalletLinks', ...links } } },
});

beforeEach(() => {
  downloads = [];
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ href: this.getAttribute('href') ?? '', download: this.download });
  });
});

afterEach(() => vi.restoreAllMocks());

describe('CheckoutSuccess', () => {
  it('confirms the payment, shows the booked pod and routes the two actions', () => {
    const { onHome, onProfile } = renderSuccess();

    expect(screen.getByTestId('checkout-success')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Payment successful');
    expect(screen.getByText('pay_ABC123')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-pod')).toHaveTextContent('Sunset Jam');
    expect(screen.getByTestId('confirmation-pod')).toHaveTextContent('when:2026-08-01T10:00:00.000Z');
    // No venue charges → no venue note.
    expect(screen.queryByTestId('success-venue-note')).not.toBeInTheDocument();

    expect(screen.getByTestId('success-profile')).toHaveTextContent('My Profile');
    fireEvent.click(screen.getByTestId('success-home'));
    fireEvent.click(screen.getByTestId('success-profile'));
    expect(onHome).toHaveBeenCalledTimes(1);
    expect(onProfile).toHaveBeenCalledTimes(1);
  });

  it('uses the caller’s label for the primary action', () => {
    renderSuccess({ profileLabel: 'My orders' });
    expect(screen.getByTestId('success-profile')).toHaveTextContent('My orders');
  });

  it('sums the venue charges into the pay-at-venue note', () => {
    renderSuccess({ pod: pod({ place_charges: [{ amount: 150 }, { amount: 100 }, { amount: null }] }) });
    expect(screen.getByTestId('success-venue-note')).toHaveTextContent(
      'Venue charges ₹250.00 are payable directly at the venue.',
    );
  });

  it('without a pod there is no pod card and no ticket download', () => {
    renderSuccess({ pod: null });
    expect(screen.queryByTestId('confirmation-pod')).not.toBeInTheDocument();
    expect(screen.queryByTestId('download-ticket')).not.toBeInTheDocument();
    expect(screen.getByTestId('download-invoice')).toBeEnabled();
  });

  it('disables the invoice download when the payment has no invoice number', () => {
    renderSuccess({ payment: payment({ invoice_no: null }) });
    expect(screen.getByTestId('download-invoice')).toBeDisabled();
  });

  it('downloads the invoice as a PDF named after a filesystem-safe invoice number', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: INVOICE_PDF, variables: { id: 'pay-doc-1' } },
        result: { data: { paymentInvoicePdfBase64: 'SU5WT0lDRQ==' } },
      },
    ];
    renderSuccess({ mocks });
    fireEvent.click(screen.getByTestId('download-invoice'));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]).toEqual({
      href: 'data:application/pdf;base64,SU5WT0lDRQ==',
      download: 'invoice-INV-2026-0042.pdf',
    });
    expect(screen.queryByTestId('invoice-error')).not.toBeInTheDocument();
  });

  it('explains when the invoice PDF is not available yet', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: INVOICE_PDF, variables: { id: 'pay-doc-1' } },
        result: { data: { paymentInvoicePdfBase64: null } },
      },
    ];
    renderSuccess({ mocks });
    fireEvent.click(screen.getByTestId('download-invoice'));

    expect(await screen.findByTestId('invoice-error')).toHaveTextContent('Invoice not available');
    expect(downloads).toHaveLength(0);
  });

  it('downloads the ticket after resolving the member’s ticket for the pod', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: MY_TICKET_FOR_POD, variables: { podId: 'pod-doc-1' } },
        result: { data: { myEventTicketForPod: { id: 'tkt-1', ticket_code: 'DUN-7788' } } },
      },
      {
        request: { query: TICKET_PDF, variables: { id: 'tkt-1' } },
        result: { data: { eventTicketPdfBase64: 'VElDS0VU' } },
      },
    ];
    renderSuccess({ mocks });
    fireEvent.click(screen.getByTestId('download-ticket'));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0]).toEqual({
      href: 'data:application/pdf;base64,VElDS0VU',
      download: 'ticket-and-invoice-DUN-7788.pdf',
    });
  });

  it('says the ticket is not ready when the server has none for the pod', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: MY_TICKET_FOR_POD, variables: { podId: 'pod-doc-1' } },
        result: { data: { myEventTicketForPod: null } },
      },
    ];
    renderSuccess({ mocks });
    fireEvent.click(screen.getByTestId('download-ticket'));

    expect(await screen.findByTestId('invoice-error')).toHaveTextContent(
      'Ticket not ready yet — check your email shortly.',
    );
    expect(downloads).toHaveLength(0);
  });

  it('says the ticket is unavailable when its PDF cannot be produced', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: MY_TICKET_FOR_POD, variables: { podId: 'pod-doc-1' } },
        result: { data: { myEventTicketForPod: { id: 'tkt-1', ticket_code: 'DUN-7788' } } },
      },
      {
        request: { query: TICKET_PDF, variables: { id: 'tkt-1' } },
        result: { data: { eventTicketPdfBase64: null } },
      },
    ];
    renderSuccess({ mocks });
    fireEvent.click(screen.getByTestId('download-ticket'));

    expect(await screen.findByTestId('invoice-error')).toHaveTextContent('Ticket not available');
    expect(downloads).toHaveLength(0);
  });

  it('labels the paid download "Ticket & invoice", since the file carries both', () => {
    renderSuccess();
    expect(screen.getByTestId('download-ticket')).toHaveTextContent('Ticket & invoice');
  });

  it('offers both wallets as links to the signed pass and the Google save link', async () => {
    renderSuccess({
      mocks: [
        walletLinks({
          apple_pass_url: 'https://server.test/tickets/tok/ticket.pkpass',
          google_save_url: 'https://pay.google.com/gp/v/save/jwt',
        }),
      ],
    });

    const apple = await screen.findByTestId('success-pod-apple-wallet');
    expect(apple).toHaveAttribute('href', 'https://server.test/tickets/tok/ticket.pkpass');
    expect(apple).not.toHaveAttribute('target');
    const google = screen.getByTestId('success-pod-google-wallet');
    expect(google).toHaveAttribute('href', 'https://pay.google.com/gp/v/save/jwt');
    expect(google).toHaveAttribute('target', '_blank');
    expect(google).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows only the wallet that is set up', async () => {
    renderSuccess({
      mocks: [walletLinks({ apple_pass_url: 'https://server.test/tickets/tok/ticket.pkpass', google_save_url: null })],
    });

    expect(await screen.findByTestId('success-pod-apple-wallet')).toBeInTheDocument();
    expect(screen.queryByTestId('success-pod-google-wallet')).not.toBeInTheDocument();
  });

  it('shows no wallet buttons, and logs, when the links cannot be loaded', async () => {
    const logError = vi.spyOn(logs.mWeb, 'error').mockImplementation(() => undefined);
    renderSuccess({
      mocks: [{ request: { query: TICKET_WALLET_LINKS, variables: { podId: 'pod-doc-1' } }, error: new Error('offline') }],
    });

    await waitFor(() =>
      expect(logError).toHaveBeenCalledWith('checkout', 'ticketWalletLinks', expect.objectContaining({ error: expect.anything() })),
    );
    expect(screen.queryByTestId('success-pod-apple-wallet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('success-pod-google-wallet')).not.toBeInTheDocument();
  });
});

// A FREE pod's instant join lands here with nothing paid (payment = null).
describe('CheckoutSuccess — free join (no payment)', () => {
  function renderFree(podOver: Record<string, unknown> = {}, mocks: MockedResponse[] = []) {
    const onHome = vi.fn();
    const onProfile = vi.fn();
    render(
      <MockedProvider mockLinkDefaultOptions={{ delay: 0 }} mocks={mocks}>
        <CheckoutSuccess
          payment={null}
          pod={pod(podOver)}
          onHome={onHome}
          onProfile={onProfile}
          profileLabel="My Bookings"
        />
      </MockedProvider>,
    );
    return { onHome, onProfile };
  }

  it('confirms the spot with the free copy, the pod and the ticket — no receipt and no invoice', () => {
    const { onHome, onProfile } = renderFree();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Spot confirmed');
    expect(screen.queryByText('Payment successful')).not.toBeInTheDocument();
    expect(screen.getByTestId('checkout-success')).toHaveTextContent(
      'This pod is free, so there is nothing to pay.',
    );
    expect(screen.queryByText('Payment ID')).not.toBeInTheDocument();
    expect(screen.queryByTestId('download-invoice')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirmation-pod')).toHaveTextContent('Sunset Jam');
    expect(screen.getByTestId('download-ticket')).toBeEnabled();
    // Nothing was paid, so the file is the ticket alone and the button says so.
    expect(screen.getByTestId('download-ticket')).toHaveTextContent(/^Ticket$/);

    expect(screen.getByTestId('success-profile')).toHaveTextContent('My Bookings');
    fireEvent.click(screen.getByTestId('success-profile'));
    fireEvent.click(screen.getByTestId('success-home'));
    expect(onProfile).toHaveBeenCalledTimes(1);
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  it('never claims venue charges were paid when nothing was', () => {
    renderFree({ place_charges: [{ amount: 150 }] });
    expect(screen.queryByTestId('success-venue-note')).not.toBeInTheDocument();
  });

  it('still downloads the ticket for the free pod', async () => {
    const mocks: MockedResponse[] = [
      {
        request: { query: MY_TICKET_FOR_POD, variables: { podId: 'pod-doc-1' } },
        result: { data: { myEventTicketForPod: { id: 'tkt-2', ticket_code: 'DUN-FREE' } } },
      },
      {
        request: { query: TICKET_PDF, variables: { id: 'tkt-2' } },
        result: { data: { eventTicketPdfBase64: 'RlJFRQ==' } },
      },
    ];
    renderFree({}, mocks);
    fireEvent.click(screen.getByTestId('download-ticket'));
    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].href).toBe('data:application/pdf;base64,RlJFRQ==');
  });
});
