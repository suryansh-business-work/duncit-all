/**
 * The ticket and its invoice as one document: page one is the ticket, page two
 * the invoice drawn by the shared invoice renderer. A free pod has no invoice,
 * so its document is the ticket alone.
 */
import { capturePdfText } from '@test/pdf-text';
import type { InvoiceData } from '@services/invoice/invoice.pdf';
import type { TicketPdfData } from '@services/ticket/ticket.pdf';
import { generateTicketWithInvoicePdf } from '@services/ticket/ticket-with-invoice.pdf';

const ticket: TicketPdfData = {
  brand: 'Duncit',
  ticket_code: 'TCK-000123',
  status: 'VALID',
  qr_token: 'signed.qr.token',
  event_title: 'Sunset Rooftop Pod',
  date_label: '4 Jul 2026, 7:30 PM',
  mode: 'IN_PERSON',
  venue_name: 'Duncit Studio',
  venue_address: '12 MG Road, Pune',
  meeting_platform: null,
  attendee_name: 'Riya Sharma',
  attendee_email: 'riya@x.com',
  seats: 1,
};

const invoice: InvoiceData = {
  invoice_no: 'DUN/2627/000777',
  invoice_date: new Date('2026-07-04T10:00:00Z'),
  customer_name: 'Riya Sharma',
  customer_email: 'riya@x.com',
  business_name: 'Duncit',
  business_address: '1 HQ Road, Pune',
  business_gstin: '27AAAAA0000A1Z5',
  currency_symbol: '₹',
  items: [{ description: 'Pod booking · Sunset Rooftop Pod', qty: 1, unit_price: 847.46, amount: 847.46 }],
  subtotal: 847.46,
  gst_amount: 152.54,
  gst_pct: 18,
  total: 1000,
  payment_id: 'pay_ticket',
  payment_method: 'Razorpay',
};

/** Page objects in the written file ("/Type /Pages" is the page tree, not a page). */
const pageCount = (pdf: Buffer) => (pdf.toString('latin1').match(/\/Type \/Page(?!s)/g) ?? []).length;

describe('generateTicketWithInvoicePdf', () => {
  const realFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('puts the invoice on a second page after the ticket', async () => {
    const pdf = await generateTicketWithInvoicePdf(ticket, invoice);

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pageCount(pdf)).toBe(2);
  });

  it('draws the ticket first and then the invoice for the same booking', async () => {
    const text = (await capturePdfText(() => generateTicketWithInvoicePdf(ticket, invoice))).map((e) => e.text);

    const ticketAt = text.indexOf('TCK-000123');
    const invoiceAt = text.indexOf('DUN/2627/000777');
    expect(ticketAt).toBeGreaterThanOrEqual(0);
    expect(invoiceAt).toBeGreaterThan(ticketAt);
    expect(text).toContain('Payment ID: pay_ticket');
  });

  it('is the ticket alone for a free pod, without fetching any logo', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const pdf = await generateTicketWithInvoicePdf(ticket, null);
    const text = (await capturePdfText(() => generateTicketWithInvoicePdf(ticket, null))).map((e) => e.text);

    expect(pageCount(pdf)).toBe(1);
    expect(text).toContain('TCK-000123');
    expect(text.some((t) => t.startsWith('Payment ID:'))).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches the invoice logo before drawing, and still renders when it cannot be fetched', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('DNS'));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const pdf = await generateTicketWithInvoicePdf(ticket, {
      ...invoice,
      invoice_logo_url: 'https://cdn.example/logo.png',
    });

    expect(fetchMock).toHaveBeenCalledWith('https://cdn.example/logo.png');
    expect(pageCount(pdf)).toBe(2);
  });

  it('rejects instead of hanging when the invoice page cannot be drawn', async () => {
    await expect(
      generateTicketWithInvoicePdf(ticket, { ...invoice, subtotal: undefined as unknown as number })
    ).rejects.toBeInstanceOf(TypeError);
  });
});
