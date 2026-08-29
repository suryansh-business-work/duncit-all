import { getUrlConfigs } from '@config/url-configs';
import { signedLink } from '@utils/signed-link';
import { joinUrl } from '@utils/url';

/**
 * The public, signed address of one ticket's PDF.
 *
 * It exists for WhatsApp. The booking template carries a DOCUMENT header, and
 * AiSensy does not accept an upload — it is handed a URL and fetches it from
 * its own servers, so the file has to be reachable from the public internet
 * with no session behind it. Every other way the ticket leaves (the email
 * attachment, `pdfBase64` for the app) is authorised by the caller and needs
 * none of this.
 *
 * The token is the whole gate: it names one ticket, is signed with the server
 * secret, and expires. Nothing about the ticket travels in the URL.
 */

/**
 * How long a minted ticket link stays good.
 *
 * AiSensy hands the URL to Meta, which fetches the file and stores it on its
 * own CDN before the message is delivered — seconds, in practice, and after
 * that the recipient's copy comes from WhatsApp rather than from here. Half an
 * hour so a queued send still finds a live link, and no longer than that
 * because the PDF carries the check-in QR: for as long as the link lives,
 * whoever holds it can walk in on that seat.
 */
export const TICKET_PDF_TTL_MS = 30 * 60_000;

const link = signedLink('ticket-pdf', TICKET_PDF_TTL_MS);

/** A link to this ticket's PDF, good for the next half hour. */
export const signTicketPdfToken = (ticketDocId: string, now?: number): string =>
  link.sign(ticketDocId, now);

/** The ticket a link names, or null when it is forged or expired. */
export const verifyTicketPdfToken = (token: string, now?: number): string | null =>
  link.verify(token, now);

/**
 * What the ticket PDF is called wherever it travels — the email attachment, the
 * signed link, and the name WhatsApp shows on the document header.
 *
 * One name, because the recipient of a booking gets it in two places and two
 * names read as two different documents.
 */
export const ticketPdfFilename = (ticketCode: string): string => `ticket-${ticketCode}.pdf`;

/** Where this ticket's PDF can be fetched from, publicly, right now. */
export async function ticketPdfUrl(ticketDocId: string): Promise<string> {
  const { serverUrl } = await getUrlConfigs();
  return joinUrl(serverUrl, `/tickets/${signTicketPdfToken(ticketDocId)}/ticket.pdf`);
}
