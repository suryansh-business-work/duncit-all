import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { normalizeSeats } from '@modules/pods/pod/pod.seats';
import type { InvoiceData, InvoiceLineItem } from '@services/invoice/invoice.pdf';
import type { IPayment } from './payment.model';

/**
 * One payment, as an invoice.
 *
 * Its own module because three places need it now and each built its own copy
 * of the same twenty-line object: the receipt email, the re-download, and the
 * ticket PDF that carries the invoice as its second page. Three copies of an
 * invoice's contents is three chances for a customer's two documents to
 * disagree about what they paid.
 *
 * It imports nothing from payment.service, so ticket.service can reach it
 * without pulling the whole payment module in behind it.
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The bill-to address, as lines, from whichever billing block the payment has. */
export function billingAddressLines(b?: IPayment['billing']): string[] {
  if (!b) return [];
  const cityState = [b.city, b.state].filter(Boolean).join(', ');
  return [
    b.line1,
    [b.line2, b.landmark].filter(Boolean).join(', '),
    [cityState, b.pincode].filter(Boolean).join(' - '),
    b.country,
  ]
    .map((s) => (s || '').trim())
    .filter(Boolean);
}

/**
 * Invoice bill-to fields — prefers the billing snapshot, falls back to the flat
 * buyer identity for older payments without a billing block. Both the main
 * contact email and a differing billing email print on the invoice.
 */
export function invoiceBillTo(doc: IPayment) {
  const b = doc.billing;
  const billingEmail = b?.email && b.email !== doc.user_email ? b.email : undefined;
  return {
    customer_name: b?.name || doc.user_name,
    customer_email: doc.user_email,
    customer_billing_email: billingEmail,
    customer_phone: b?.phone || doc.user_phone || undefined,
    customer_gstin: b?.gstin || undefined,
    customer_address_lines: billingAddressLines(b),
  };
}

/** Seats the payment bought, frozen in its metadata when it was priced. */
const paidSeats = (meta: Record<string, unknown>) => normalizeSeats(Number(meta.seats ?? 1));

/**
 * What the booking's tickets actually sold for: every seat at list price, less
 * the multi-ticket discount frozen on the payment. `ticket_gross` exists only on
 * payments priced after the discount shipped; older rows had no discount, so one
 * seat's price times the seats is exact for them.
 */
function soldTicketGross(doc: IPayment, meta: Record<string, unknown>, seats: number): number {
  const frozen = Number(meta.ticket_gross ?? Number.NaN);
  const listGross = Number.isFinite(frozen) ? frozen : Number(meta.ticket_amount ?? 0) * seats;
  return round2(Math.max(0, listGross - (doc.ticket_discount_amount ?? 0)));
}

export function buildInvoiceItems(doc: IPayment): InvoiceLineItem[] {
  const meta: Record<string, unknown> = doc.metadata ?? {};
  const productLines = Array.isArray(meta.product_lines)
    ? (meta.product_lines as Record<string, unknown>[])
    : [];
  const isProductPayment = meta.source === 'app_product_checkout';
  // `ticket_amount` is the price of ONE seat; the booking may hold several. The
  // split below weighs the ticket against the products, so comparing a unit
  // price with a product total handed the ticket too small a share of the bill.
  // The weight is the DISCOUNTED ticket money: the products were charged in full,
  // so weighing them against list-price tickets would understate their share.
  const seats = paidSeats(meta);
  const ticketGross = soldTicketGross(doc, meta, seats);
  const productGross = round2(
    productLines.reduce((sum, l) => sum + Number(l.gross || 0), 0)
  );
  const totalGross = round2(ticketGross + productGross);
  // The invoice has a QTY column and the pod line was always claiming 1, so a
  // four-seat booking read as one ticket at four times the price.
  const podLine = (amount: number, description: string): InvoiceLineItem => ({
    description,
    qty: seats,
    unit_price: round2(amount / seats),
    amount,
  });

  if (productLines.length === 0 || totalGross <= 0) {
    return [podLine(doc.subtotal, doc.description)];
  }

  // Proportional share of the net subtotal, largest-remainder-safe: the residual
  // line absorbs the rounding residue so the items sum to the subtotal exactly.
  const shareOf = (gross: number) => round2((doc.subtotal * gross) / totalGross);
  const items: InvoiceLineItem[] = productLines.map((l) => {
    const amount = shareOf(Number(l.gross || 0));
    const qty = Number(l.quantity) || 1;
    // Named explicitly as a string: a product line comes off `metadata`, which
    // is Mixed, so anything at all could be sitting in `name`.
    const name = typeof l.name === 'string' && l.name ? l.name : 'Product';
    return { description: name, qty, unit_price: round2(amount / qty), amount };
  });
  const productsNet = round2(items.reduce((sum, it) => sum + it.amount, 0));
  const residualNet = round2(doc.subtotal - productsNet);

  // Product cart: the residual is the (net) delivery charge — omit it when there
  // was no shipping. Pod checkout: the residual is the event ticket.
  if (isProductPayment) {
    if (residualNet <= 0) return items;
    return [
      ...items,
      { description: 'Delivery charge', qty: 1, unit_price: residualNet, amount: residualNet },
    ];
  }
  return [podLine(residualNet, doc.description || 'Event ticket'), ...items];
}

/**
 * Everything the invoice renderer needs, from one payment.
 *
 * `paymentMethod` is passed in because the caller knows which gateway actually
 * took the money at the moment it did; a re-read later only has the stored
 * gateway name to go on.
 */
export async function invoiceDataForPayment(
  doc: IPayment,
  options: { paymentMethod: string; currencySymbol?: string }
): Promise<InvoiceData> {
  const fs = await getFinanceSettings();
  return {
    invoice_no: doc.invoice_no ?? '',
    invoice_date: doc.paid_at ?? doc.created_at,
    ...invoiceBillTo(doc),
    business_name: fs.business_name,
    business_address: fs.business_address,
    business_gstin: fs.business_gstin,
    currency_symbol: options.currencySymbol ?? fs.currency_symbol,
    items: buildInvoiceItems(doc),
    subtotal: doc.subtotal,
    gst_amount: doc.gst_amount,
    gst_pct: doc.gst_pct,
    total: doc.total,
    payment_id: doc.payment_id,
    payment_method: options.paymentMethod,
    // Both halves of the coin movement this order caused. Read off the payment
    // rather than recomputed: the rate can change after the fact, and an
    // invoice must keep saying what actually happened.
    coins_redeemed: doc.coins_redeemed ?? 0,
    coins_earned: doc.coins_earned ?? 0,
    // The multi-ticket discount as frozen on the payment, never re-derived from
    // the pod — its tiers can be edited after this booking was priced.
    ticket_discount_pct: doc.ticket_discount_pct ?? 0,
    ticket_discount_amount: doc.ticket_discount_amount ?? 0,
    ticket_discount_tickets: paidSeats(doc.metadata ?? {}),
    invoice_label: fs.invoice_label,
    invoice_support_email: fs.invoice_support_email,
    invoice_support_phone: fs.invoice_support_phone,
    invoice_footer_note: fs.invoice_footer_note,
    invoice_terms: fs.invoice_terms,
    invoice_logo_url: fs.invoice_logo_url,
  };
}
