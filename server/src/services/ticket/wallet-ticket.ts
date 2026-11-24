/**
 * What a wallet pass shows — the same facts the ticket PDF prints, plus the ids
 * and ISO times a wallet needs to file and surface the pass.
 */
export interface WalletTicket {
  /** The ticket document id; names the pass so re-adding it updates, not duplicates. */
  id: string;
  pod_id: string;
  brand: string;
  ticket_code: string;
  /** The signed check-in token — the pass barcode carries exactly what the PDF's QR does. */
  qr_token: string;
  seats: number;
  event_title: string;
  /** ISO start, when the pod has one; wallets use it to surface the pass on the day. */
  starts_at: string | null;
  ends_at: string | null;
  /** The start as the PDF prints it, in the admin-configured format. */
  date_label: string;
  mode: string;
  venue_name: string | null;
  venue_address: string | null;
  meeting_platform: string | null;
  attendee_name: string;
}

/** The pass's location line: the venue, or the meeting platform for a virtual pod. */
export function walletPlace(t: WalletTicket): { label: string; value: string } {
  return t.mode === 'VIRTUAL'
    ? { label: 'MEETING', value: t.meeting_platform || 'Online' }
    : { label: 'VENUE', value: t.venue_name || '—' };
}

/** A valid ISO instant, or null — a wallet rejects the whole pass over one bad date. */
export function isoOrNull(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
