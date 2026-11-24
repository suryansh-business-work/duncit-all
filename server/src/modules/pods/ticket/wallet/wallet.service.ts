import { Types } from 'mongoose';
import { getFinanceSettings } from '@modules/finance/finance/finance.model';
import { buildApplePass } from '@services/ticket/apple-pass';
import { googleWalletSaveUrl } from '@services/ticket/google-wallet';
import { walletPassImages } from '@services/ticket/wallet-images';
import type { WalletTicket } from '@services/ticket/wallet-ticket';
import { dateLabel, ticketService } from '../ticket.service';
import { ticketPassUrl, walletLogoUrl } from '../ticket.download';
import { appleWalletConfig, googleWalletConfig } from './wallet.config';

/**
 * Pod tickets as wallet passes.
 *
 * The pass is the ticket in another form — same QR, same facts — so it is built
 * from the ticket the member already owns and never issues anything the PDF
 * would not. A cancelled ticket gets no pass.
 */

export interface WalletLinks {
  apple_pass_url: string | null;
  google_save_url: string | null;
}

const NO_LINKS: WalletLinks = { apple_pass_url: null, google_save_url: null };

type PubTicket = NonNullable<Awaited<ReturnType<typeof ticketService.getById>>>;

function toWalletTicket(t: PubTicket, brand: string): WalletTicket {
  return {
    id: t.id,
    pod_id: t.pod_id,
    brand,
    ticket_code: t.ticket_code,
    qr_token: t.qr_token,
    seats: t.seats,
    event_title: t.pod_title || 'Event',
    starts_at: t.pod_date_time,
    ends_at: t.pod_end_date_time,
    date_label: dateLabel(t.pod_date_time),
    mode: t.pod_mode,
    venue_name: t.venue_name,
    venue_address: t.venue_address,
    meeting_platform: t.meeting_platform,
    attendee_name: t.user_name,
  };
}

export const walletService = {
  /**
   * The wallet links for the caller's own ticket to a pod. Each is null when its
   * wallet is not set up in the Tech portal, and both are null when there is no
   * live ticket — the clients show only the buttons that come back.
   */
  async linksForPod(podDocId: string, userId: string): Promise<WalletLinks> {
    if (!Types.ObjectId.isValid(podDocId)) return NO_LINKS;
    const [ticket, apple, google] = await Promise.all([
      ticketService.forPodAndUser(podDocId, userId),
      appleWalletConfig(),
      googleWalletConfig(),
    ]);
    if (!ticket || ticket.status === 'CANCELLED') return NO_LINKS;
    let googleUrl: string | null = null;
    if (google) {
      const [settings, logoUrl] = await Promise.all([getFinanceSettings(), walletLogoUrl()]);
      googleUrl = googleWalletSaveUrl(toWalletTicket(ticket, settings.business_name), google, logoUrl);
    }
    return {
      apple_pass_url: apple ? await ticketPassUrl(ticket.id) : null,
      google_save_url: googleUrl,
    };
  },

  /**
   * The .pkpass behind a signed link. The link is the authorisation (see
   * ticket.download.ts); every failure is null, which the route turns into the
   * same 404.
   */
  async applePassForLink(ticketDocId: string): Promise<{ pass: Buffer; filename: string } | null> {
    if (!Types.ObjectId.isValid(ticketDocId)) return null;
    const [ticket, apple] = await Promise.all([ticketService.getById(ticketDocId), appleWalletConfig()]);
    if (!ticket || ticket.status === 'CANCELLED' || !apple) return null;
    const [settings, images] = await Promise.all([getFinanceSettings(), walletPassImages()]);
    return {
      pass: buildApplePass(toWalletTicket(ticket, settings.business_name), apple, images),
      filename: `ticket-${ticket.ticket_code}.pkpass`,
    };
  },
};
