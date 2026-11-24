import jwt from 'jsonwebtoken';
import type { GoogleServiceAccount } from '@utils/googleServiceAccount';
import { TICKET_ACCENT } from './ticket.pdf';
import { isoOrNull, walletPlace, type WalletTicket } from './wallet-ticket';

/**
 * The "Save to Google Wallet" link for one ticket.
 *
 * Google takes the pass as a JWT signed by the issuer's service account, with
 * the event class (one per pod) and the ticket object (one per ticket) inside
 * it. Both ids are derived from our own ids, so saving the same ticket twice
 * opens the pass already in the wallet instead of adding a second one, and the
 * link needs no API call or stored state on our side.
 */

const SAVE_URL = 'https://pay.google.com/gp/v/save/';
const LANGUAGE = 'en-US';

const localized = (value: string) => ({ defaultValue: { language: LANGUAGE, value } });

export const googleClassId = (issuerId: string, podId: string) => `${issuerId}.duncit_pod_${podId}`;
export const googleObjectId = (issuerId: string, ticketId: string) => `${issuerId}.duncit_ticket_${ticketId}`;

export function eventTicketClass(t: WalletTicket, issuerId: string, logoUrl: string) {
  const start = isoOrNull(t.starts_at);
  const end = isoOrNull(t.ends_at);
  const place = walletPlace(t);
  const venue =
    t.mode !== 'VIRTUAL' && t.venue_name
      ? { name: localized(t.venue_name), address: localized(t.venue_address || t.venue_name) }
      : undefined;
  return {
    id: googleClassId(issuerId, t.pod_id),
    issuerName: t.brand,
    reviewStatus: 'UNDER_REVIEW',
    eventName: localized(t.event_title),
    logo: { sourceUri: { uri: logoUrl }, contentDescription: localized(t.brand) },
    hexBackgroundColor: TICKET_ACCENT,
    ...(venue ? { venue } : {}),
    ...(start ? { dateTime: { start, ...(end ? { end } : {}) } } : {}),
    ...(venue ? {} : { textModulesData: [{ id: 'place', header: place.label, body: place.value }] }),
  };
}

export function eventTicketObject(t: WalletTicket, issuerId: string) {
  const seats = Math.max(1, Math.floor(Number(t.seats) || 1));
  return {
    id: googleObjectId(issuerId, t.id),
    classId: googleClassId(issuerId, t.pod_id),
    state: 'ACTIVE',
    ticketHolderName: t.attendee_name || undefined,
    ticketNumber: t.ticket_code,
    hexBackgroundColor: TICKET_ACCENT,
    barcode: { type: 'QR_CODE', value: t.qr_token, alternateText: t.ticket_code },
    ...(seats > 1 ? { textModulesData: [{ id: 'admits', header: 'ADMITS', body: `${seats} people` }] } : {}),
  };
}

/** The signed save link. `logoUrl` must be publicly reachable — Google fetches it. */
export function googleWalletSaveUrl(
  t: WalletTicket,
  config: { issuerId: string; account: GoogleServiceAccount },
  logoUrl: string
): string {
  const token = jwt.sign(
    {
      iss: config.account.client_email,
      aud: 'google',
      typ: 'savetowallet',
      origins: [],
      payload: {
        eventTicketClasses: [eventTicketClass(t, config.issuerId, logoUrl)],
        eventTicketObjects: [eventTicketObject(t, config.issuerId)],
      },
    },
    config.account.private_key,
    { algorithm: 'RS256' }
  );
  return `${SAVE_URL}${token}`;
}
