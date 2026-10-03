import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type MockedResponse } from '@apollo/client/testing';
import { MockedProvider } from '@apollo/client/testing/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import CheckoutSuccess from '../CheckoutSuccess';
import { INVOICE_PDF, MY_TICKET_FOR_POD, TICKET_PDF } from '../CheckoutSuccess/queries';

const h = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock('../../../components/notify', () => ({ notify: h.notify }));
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

beforeEach(() => {
  h.notify.mockReset();
  vi.mocked(window.open).mockReset();
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

  it('opens a Google Calendar event spanning the pod’s start and end', () => {
    renderSuccess();
    fireEvent.click(screen.getByTestId('success-pod-google-wallet'));

    expect(window.open).toHaveBeenCalledTimes(1);
    const [url, target, features] = vi.mocked(window.open).mock.calls[0];
    const parsed = new URL(String(url));
    expect(parsed.origin + parsed.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(parsed.searchParams.get('action')).toBe('TEMPLATE');
    expect(parsed.searchParams.get('text')).toBe('Sunset Jam');
    expect(parsed.searchParams.get('dates')).toBe('20260801T100000Z/20260801T120000Z');
    expect(parsed.searchParams.get('details')).toBe('Your Duncit booking is confirmed.');
    expect(target).toBe('_blank');
    expect(features).toBe('noopener,noreferrer');
  });

  it('defaults the calendar event to one hour and a generic title when the pod lacks them', () => {
    renderSuccess({ pod: pod({ pod_title: '', pod_end_date_time: null }) });
    fireEvent.click(screen.getByTestId('success-pod-google-wallet'));

    const parsed = new URL(String(vi.mocked(window.open).mock.calls[0][0]));
    expect(parsed.searchParams.get('text')).toBe('Duncit Pod');
    expect(parsed.searchParams.get('dates')).toBe('20260801T100000Z/20260801T110000Z');
  });

  it('tells the member Apple Wallet is not available yet', () => {
    renderSuccess();
    fireEvent.click(screen.getByTestId('success-pod-apple-wallet'));
    expect(h.notify).toHaveBeenCalledWith(
      'Apple Wallet pass is not available yet. Invoice download is separate below.',
      'info',
    );
    expect(window.open).not.toHaveBeenCalled();
  });
});
