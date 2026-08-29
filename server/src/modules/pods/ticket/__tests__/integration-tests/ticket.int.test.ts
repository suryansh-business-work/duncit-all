jest.mock('@services/email/email.service', () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@modules/platform/whatsapp/whatsapp.service', () => ({
  whatsappService: { send: jest.fn().mockResolvedValue({ status: 'SENT', reason: '', message_id: 'm1' }) },
}));

import { Types } from 'mongoose';
import { ticketService } from '../../ticket.service';
import { TicketModel } from '../../ticket.model';
import { signTicketToken } from '../../ticket.token';
import { verifyTicketPdfToken } from '../../ticket.download';
import { sendEmail } from '@services/email/email.service';
import { whatsappService } from '@modules/platform/whatsapp/whatsapp.service';

const podId = new Types.ObjectId();
const userId = new Types.ObjectId();

const makeTicket = (over: Record<string, any> = {}) => {
  const code = over.ticket_code ?? `TKT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const membership_id = over.membership_id ?? new Types.ObjectId();
  const uid = over.user_id ?? userId;
  return TicketModel.create({
    ticket_code: code,
    membership_id,
    pod_id: over.pod_id ?? podId,
    user_id: uid,
    status: over.status ?? 'VALID',
    qr_token: signTicketToken({
      t: code,
      u: String(uid),
      p: String(over.pod_id ?? podId),
      m: String(membership_id),
    }),
    snapshot: { pod_title: 'Jam', pod_mode: 'PHYSICAL', user_name: 'A', user_email: 'a@a.com' },
    ...over,
  });
};

describe('ticketService integration', () => {
  it('returns null issuing for a missing membership', async () => {
    expect(await ticketService.ensureForMembership(new Types.ObjectId().toString())).toBeNull();
  });

  it('verifies a valid ticket and rejects tampered / cancelled', async () => {
    const t = await makeTicket();
    const ok = await ticketService.verify(t.qr_token);
    expect(ok.ok).toBe(true);
    expect(ok.ticket?.ticket_code).toBe(t.ticket_code);
    expect((await ticketService.verify('bad.token')).ok).toBe(false);

    const cancelled = await makeTicket({ status: 'CANCELLED' });
    expect((await ticketService.verify(cancelled.qr_token)).ok).toBe(false);
  });

  it('checks in by token (idempotent) and blocks cancelled', async () => {
    const t = await makeTicket();
    const admin = new Types.ObjectId().toString();
    const res = await ticketService.checkIn({ token: t.qr_token }, admin);
    expect(res.status).toBe('CHECKED_IN');
    // idempotent
    const again = await ticketService.checkIn({ ticket_doc_id: t.id }, admin);
    expect(again.status).toBe('CHECKED_IN');
    // already-checked-in verify is still ok with a message
    expect((await ticketService.verify(t.qr_token)).message).toMatch(/already checked in/i);

    const cancelled = await makeTicket({ status: 'CANCELLED' });
    await expect(ticketService.checkIn({ token: cancelled.qr_token }, admin)).rejects.toThrow(/cancelled/i);
  });

  it('lists for a user, finds by pod, and filters for admin', async () => {
    await makeTicket({ ticket_code: 'TKT-LISTA' });
    expect((await ticketService.listForUser(userId.toString())).length).toBeGreaterThan(0);
    expect(await ticketService.forPodAndUser(podId.toString(), userId.toString())).not.toBeNull();
    const admin = await ticketService.listAdmin({ search: 'TKT-LISTA' });
    expect(admin.some((t) => t.ticket_code === 'TKT-LISTA')).toBe(true);
  });

  it('serves the PDF to the owner but not to a stranger', async () => {
    const t = await makeTicket();
    const b64 = await ticketService.pdfBase64(t.id, userId.toString(), false);
    expect(b64.length).toBeGreaterThan(100);
    await expect(
      ticketService.pdfBase64(t.id, new Types.ObjectId().toString(), false)
    ).rejects.toThrow(/not your ticket/i);
    // admin can fetch any
    const asAdmin = await ticketService.pdfBase64(t.id, new Types.ObjectId().toString(), true);
    expect(asAdmin.length).toBeGreaterThan(100);
  });

  it('serves the eventTicketsTable page with search, filters, sort and paging', async () => {
    const podA = new Types.ObjectId();
    await makeTicket({
      ticket_code: 'TKT-AAA11',
      pod_id: podA,
      snapshot: { pod_title: 'Jazz Night', pod_mode: 'PHYSICAL', user_name: 'Asha Rao', user_email: 'asha@example.com' },
    });
    await makeTicket({
      ticket_code: 'TKT-BBB22',
      status: 'CHECKED_IN',
      snapshot: { pod_title: 'Poetry Slam', pod_mode: 'PHYSICAL', user_name: 'Bela Sen', user_email: 'bela@example.com' },
    });
    await makeTicket({
      ticket_code: 'TKT-CCC33',
      status: 'CANCELLED',
      snapshot: { pod_title: 'Jazz Night', pod_mode: 'PHYSICAL', user_name: 'Chirag Dev', user_email: 'chirag@example.com' },
    });

    const all = await ticketService.table();
    expect(all.total).toBe(3);
    expect(all.page).toBe(1);
    expect(all.page_size).toBe(25);

    // Search spans code, attendee name/email and event title (same as listAdmin).
    const byCode = await ticketService.table({ search: 'bbb22' });
    expect(byCode.rows.map((r) => r.ticket_code)).toEqual(['TKT-BBB22']);
    const byAttendee = await ticketService.table({ search: 'asha' });
    expect(byAttendee.rows.map((r) => r.ticket_code)).toEqual(['TKT-AAA11']);
    const byEvent = await ticketService.table({ search: 'jazz' });
    expect(byEvent.total).toBe(2);

    // Enum + id filters narrow.
    const cancelled = await ticketService.table({
      filters: [{ field: 'status', op: 'eq', value: 'CANCELLED' }],
    });
    expect(cancelled.rows.map((r) => r.ticket_code)).toEqual(['TKT-CCC33']);
    const byPod = await ticketService.table({
      filters: [{ field: 'pod_id', op: 'eq', value: String(podA) }],
    });
    expect(byPod.rows.map((r) => r.ticket_code)).toEqual(['TKT-AAA11']);

    // Allowlisted sort + paging over it.
    const sorted = await ticketService.table({ sort_by: 'ticket_code', sort_dir: 'asc' });
    expect(sorted.rows.map((r) => r.ticket_code)).toEqual(['TKT-AAA11', 'TKT-BBB22', 'TKT-CCC33']);
    const page2 = await ticketService.table({ sort_by: 'ticket_code', sort_dir: 'asc', page: 2, page_size: 1 });
    expect(page2.rows.map((r) => r.ticket_code)).toEqual(['TKT-BBB22']);
    expect(page2.total).toBe(3);
    expect(page2.page).toBe(2);
    expect(page2.page_size).toBe(1);
  });

  // A free join never reaches finalizePaidPayment, so the ticket email is the
  // ONLY booking email such a member gets. It used to link at the bare app
  // origin, which is exactly the "opens mWeb but does not navigate to the pod"
  // complaint — on free pods the deep link was simply absent.
  describe('event-ticket "View Booking" CTA', () => {
    it('deep-links to the booking, not the app root', async () => {
      (sendEmail as jest.Mock).mockClear();
      const membership_id = new Types.ObjectId();
      const ticket = await makeTicket({ membership_id });

      await ticketService.email(ticket as never);

      const [opts] = (sendEmail as jest.Mock).mock.calls.at(-1) as [Record<string, any>];
      expect(opts.template).toBe('event-ticket');
      expect(opts.vars.booking_url).toMatch(new RegExp(`/booking/${String(membership_id)}$`));
      // Templates cached in the DB still render the old {{app_url}} CTA.
      expect(opts.vars.app_url).toBe(opts.vars.booking_url);
    });
  });

  // The booking template carries a DOCUMENT header. A send that names no asset
  // falls back to the platform default, which is how a shared placeholder
  // arrived on WhatsApp in place of the ticket.
  describe('WhatsApp booking confirmation', () => {
    it('carries this ticket as a PDF, not the platform default', async () => {
      (whatsappService.send as jest.Mock).mockClear();
      const ticket = await makeTicket({ ticket_code: 'TKT-WA001' });

      await ticketService.email(ticket as never);

      const [input] = (whatsappService.send as jest.Mock).mock.calls.at(-1) as [Record<string, any>];
      expect(input.event).toBe('USER_BOOKING_SUCCESSFUL');
      expect(input.media.filename).toBe('ticket-TKT-WA001.pdf');
      expect(input.media.url).toMatch(/\/tickets\/[^/]+\/ticket\.pdf$/);
      // The link names THIS ticket, and nothing else about it is in the URL.
      const token = input.media.url.split('/tickets/')[1].replace('/ticket.pdf', '');
      expect(verifyTicketPdfToken(token)).toBe(String(ticket._id));
      expect(input.media.url).not.toContain('TKT-WA001');
    });
  });
});
