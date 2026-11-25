import { Linking } from 'react-native';
import { CrmTelephony } from 'crm-telephony';

/** What happened when the app tried to place a call. */
export type DialResult = 'called' | 'dialer' | 'unavailable';

/** Only what a dialler understands: digits, a leading +, * and #. */
export const dialable = (raw: string): string => raw.replace(/[^\d+*#]/g, '');

/**
 * Place a normal SIM call. With "Place calls" allowed the CRM dialer calls
 * straight away (and tells the call receiver this is a CRM call, so its
 * post-call screen appears); without it the phone's dialer opens with the
 * number filled in.
 */
export async function dialNumber(raw: string): Promise<DialResult> {
  const number = dialable(raw);
  if (!number) return 'unavailable';
  if (CrmTelephony) {
    try {
      return CrmTelephony.placeCall(number) ? 'called' : 'dialer';
    } catch {
      // Fall through to the system dialer below.
    }
  }
  const url = `tel:${number}`;
  if (!(await Linking.canOpenURL(url))) return 'unavailable';
  await Linking.openURL(url);
  return 'dialer';
}

/** WhatsApp chat with a number (digits only, country code included as stored). */
export const whatsappUrl = (raw: string): string => `https://wa.me/${raw.replace(/\D/g, '')}`;
