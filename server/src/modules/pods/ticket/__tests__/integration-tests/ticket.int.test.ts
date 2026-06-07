import { Types } from 'mongoose';
import { ticketService } from '../../ticket.service';
import { TicketModel } from '../../ticket.model';
import { signTicketToken } from '../../ticket.token';

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
});
