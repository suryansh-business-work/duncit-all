import { Types } from 'mongoose';
import { TicketModel } from '@modules/support/ticket/ticket.model';
import {
  BouncerSosAlertModel,
  BouncerCallbackRequestModel,
} from '@modules/support/bouncer/bouncer.model';
import { SupportChatSessionModel } from './supportChat.model';

export interface UnifiedSupportTicket {
  id: string;
  ticket_no: string;
  title: string;
  status: string;
  source: 'TICKET' | 'SOS' | 'CALLBACK' | 'CHAT';
  created_at: string;
}

/** Prefixed human ticket number, derived from the document id so it is stable
 * and unique per category: ST-A1B2C3, SOS-…, CB-…, CH-…. */
export function ticketNo(prefix: string, id: Types.ObjectId | string): string {
  return `${prefix}-${String(id).slice(-6).toUpperCase()}`;
}

const iso = (d?: Date | null) => d?.toISOString?.() ?? '';

/**
 * Every support item the user has ever raised, across all four categories,
 * newest first — powers the "All Support Tickets" list in mWeb and the App.
 */
export async function listMyUnifiedSupportTickets(
  userId: string
): Promise<UnifiedSupportTicket[]> {
  const uid = new Types.ObjectId(userId);
  const [tickets, sos, callbacks, chats] = await Promise.all([
    TicketModel.find({ user_id: uid }).sort({ created_at: -1 }).limit(200),
    BouncerSosAlertModel.find({ user_id: uid }).sort({ created_at: -1 }).limit(200),
    BouncerCallbackRequestModel.find({ user_id: uid }).sort({ created_at: -1 }).limit(200),
    SupportChatSessionModel.find({ user_id: uid }).sort({ created_at: -1 }).limit(200),
  ]);

  const rows: UnifiedSupportTicket[] = [
    ...tickets.map((t: any) => ({
      id: String(t._id),
      ticket_no: ticketNo('ST', t._id),
      title: t.subject || 'Support ticket',
      status: t.status || 'OPEN',
      source: 'TICKET' as const,
      created_at: iso(t.created_at),
    })),
    ...sos.map((s: any) => ({
      id: String(s._id),
      ticket_no: ticketNo('SOS', s._id),
      title: s.message || 'SOS alert',
      status: s.status || 'OPEN',
      source: 'SOS' as const,
      created_at: iso(s.created_at),
    })),
    ...callbacks.map((c: any) => ({
      id: String(c._id),
      ticket_no: ticketNo('CB', c._id),
      title: c.reason || 'Callback request',
      status: c.status || 'PENDING',
      source: 'CALLBACK' as const,
      created_at: iso(c.created_at),
    })),
    ...chats.map((c: any) => ({
      id: String(c._id),
      ticket_no: ticketNo('CH', c._id),
      title: c.last_message_preview || 'Chat with us',
      status: c.status || 'OPEN',
      source: 'CHAT' as const,
      created_at: iso(c.created_at),
    })),
  ];

  return rows.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}
