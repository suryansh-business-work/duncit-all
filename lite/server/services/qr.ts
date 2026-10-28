import QRCode from 'qrcode';
import { badInput } from '../utils/errors';
import { UPI_ID, cleanText } from '../utils/validate';

/** The `upi://pay` deep link every UPI app opens: payee address, name, amount and a note. */
export function upiLink(upiId: string, name: string, amount: number | null, note: string): string {
  const id = upiId.trim().toLowerCase();
  if (!UPI_ID.test(id)) throw badInput('Enter a valid UPI ID, like name@bank');
  const params = new URLSearchParams({ pa: id, cu: 'INR' });
  const payee = cleanText(name, 80, 'Payee name');
  if (payee) params.set('pn', payee);
  if (amount && amount > 0) params.set('am', String(Math.trunc(amount)));
  const memo = cleanText(note, 60, 'Note');
  if (memo) params.set('tn', memo);
  return `upi://pay?${params.toString()}`;
}

/** A PNG data URL of the link, sized for a phone screen. */
export async function upiQrDataUrl(link: string): Promise<string> {
  return QRCode.toDataURL(link, { width: 280, margin: 1, errorCorrectionLevel: 'M' });
}

/**
 * What a ticket's check-in QR carries: a fixed prefix, the event and the
 * guest's check-in code. Naming the event lets the door scanner say "this
 * ticket is for another event" instead of "not found". Nothing personal is in it.
 */
const TICKET_QR = /^duncit-lite:([a-f\d]{24}):([A-Z\d]{4,12})$/i;
export const ticketQrPayload = (eventId: string, code: string): string => `duncit-lite:${eventId}:${code}`;

/** The event and code out of a scanned QR, or null when it is not a Lite ticket. */
export function parseTicketQr(value: string): { eventId: string; code: string } | null {
  const match = TICKET_QR.exec(value.trim());
  return match ? { eventId: match[1].toLowerCase(), code: match[2].toUpperCase() } : null;
}

const TICKET_QR_OPTIONS = { width: 440, margin: 1, errorCorrectionLevel: 'M' } as const;

/** The ticket QR as a PNG, for the confirmation email's inline image. */
export const ticketQrPng = (eventId: string, code: string): Promise<Buffer> => QRCode.toBuffer(ticketQrPayload(eventId, code), TICKET_QR_OPTIONS);

/** The ticket QR as a data URL, for the ticket page. */
export const ticketQrDataUrl = (eventId: string, code: string): Promise<string> => QRCode.toDataURL(ticketQrPayload(eventId, code), TICKET_QR_OPTIONS);
