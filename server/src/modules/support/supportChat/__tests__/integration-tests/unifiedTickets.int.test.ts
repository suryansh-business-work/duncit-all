import { Types } from 'mongoose';
import { listMyUnifiedSupportTickets, ticketNo } from '../../unifiedTickets.service';
import { SupportChatSessionModel } from '../../supportChat.model';
import { TicketModel } from '@modules/support/ticket/ticket.model';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
} from '@modules/support/bouncer/bouncer.model';

describe('unified support tickets', () => {
  it('derives a stable, prefixed ticket number per category', () => {
    const id = new Types.ObjectId('64b5f0c2a1b2c3d4e5f6a7b8');
    expect(ticketNo('ST', id)).toBe('ST-F6A7B8');
    expect(ticketNo('SOS', id)).toBe('SOS-F6A7B8');
  });

  it('aggregates tickets, SOS, callbacks and chats for one user, newest first', async () => {
    const uid = new Types.ObjectId();
    const otherUid = new Types.ObjectId();

    await TicketModel.create({
      user_id: uid,
      subject: 'Refund issue',
      category: 'PAYMENT',
      status: 'OPEN',
      last_message_at: new Date(),
    } as any);
    await BouncerSosAlertModel.create({
      user_id: uid,
      pod_id: new Types.ObjectId(),
      message: 'Help',
      status: 'ACTIVE',
    } as any);
    await BouncerCallbackRequestModel.create({ user_id: uid, reason: 'Call me', contact_phone: '999' } as any);
    await SupportChatSessionModel.create({
      user_id: uid,
      status: 'OPEN',
      last_message_at: new Date(),
      last_message_preview: 'Hi there',
    } as any);
    // Another user's item must not leak in.
    await BouncerCallbackRequestModel.create({ user_id: otherUid, reason: 'Other', contact_phone: '888' } as any);

    const rows = await listMyUnifiedSupportTickets(String(uid));
    expect(rows).toHaveLength(4);
    const sources = rows.map((r) => r.source).sort();
    expect(sources).toEqual(['CALLBACK', 'CHAT', 'SOS', 'TICKET']);
    for (const row of rows) {
      expect(row.ticket_no).toMatch(/^(ST|SOS|CB|CH)-[0-9A-F]{6}$/);
      expect(row.title).toBeTruthy();
      expect(row.status).toBeTruthy();
    }
    // Newest first ordering.
    const times = rows.map((r) => new Date(r.created_at).getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it('falls back to category labels when items have no text', async () => {
    const uid = new Types.ObjectId();
    await BouncerCallbackRequestModel.create({ user_id: uid, contact_phone: '777' } as any);
    const rows = await listMyUnifiedSupportTickets(String(uid));
    expect(rows[0]?.title).toBe('Callback request');
  });
});
