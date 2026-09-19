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
