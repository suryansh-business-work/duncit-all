import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { TicketModel, type ITicket, type TicketStatus, type TicketCategory } from './ticket.model';
import { UserModel } from '@modules/access/user/user.model';
import { emitToSupportAgents, emitToSupportUser } from '@modules/support/supportChat/supportChat.socket';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

async function buildActor(userId: Types.ObjectId | string | null | undefined) {
  if (!userId) return null;
  const u = await UserModel.findById(userId).select(
    'profile.first_name profile.last_name profile.profile_photo auth.phone.number auth.phone.extension'
  );
  if (!u) return null;
  const num = u.auth?.phone?.number || '';
  const ext = u.auth?.phone?.extension
    ? `+${String(u.auth.phone.extension).replace(/^\+/, '')}`
    : '';
  return {
    id: String(u._id),
    name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'User',
    phone: num ? `${ext}${num}` : null,
    avatar_url: u.profile?.profile_photo ?? null,
  };
}

async function toPub(doc: ITicket) {
  const [user, assignee] = await Promise.all([
    buildActor(doc.user_id),
    doc.assignee_id ? buildActor(doc.assignee_id) : null,
  ]);
  return {
    id: String(doc._id),
    user: user ?? { id: String(doc.user_id), name: 'User', phone: null, avatar_url: null },
    subject: doc.subject,
    category: doc.category,
    status: doc.status,
    priority: doc.priority,
    assignee_id: doc.assignee_id ? String(doc.assignee_id) : null,
    assignee_name: assignee?.name ?? null,
    last_message_at: doc.last_message_at?.toISOString?.() ?? '',
    message_count: doc.messages.length,
    messages: doc.messages.map((m) => ({
      id: String(m._id),
      author_id: String(m.author_id),
      author_role: m.author_role,
      author_name: m.author_name || '',
      author_photo: m.author_photo || null,
      body_html: m.body_html || '',
      body_text: m.body_text || '',
      attachments: m.attachments || [],
      created_at: m.created_at?.toISOString?.() ?? '',
    })),
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

async function actorMeta(userId: string, role: 'USER' | 'AGENT') {
  const u = await UserModel.findById(userId).select(
    'profile.first_name profile.last_name profile.profile_photo'
  );
  return {
    author_id: new Types.ObjectId(userId),
    author_role: role,
    author_name: u
      ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || (role === 'AGENT' ? 'Support' : 'User')
      : role === 'AGENT' ? 'Support' : 'User',
    author_photo: u?.profile?.profile_photo || '',
  };
}

export const ticketService = {
  async createTicket(
    userId: string,
    input: {
      subject: string;
      category?: TicketCategory;
      body_html?: string;
      body_text: string;
      attachments?: string[];
    }
  ) {
    const subject = (input.subject || '').trim();
    const bodyText = (input.body_text || '').trim();
    if (!subject) fail('BAD_USER_INPUT', 'Subject is required');
    if (!bodyText) fail('BAD_USER_INPUT', 'Message is required');

    const meta = await actorMeta(userId, 'USER');
    const now = new Date();
    const doc = await TicketModel.create({
      user_id: new Types.ObjectId(userId),
      subject,
      category: input.category ?? 'GENERAL',
      status: 'OPEN',
      priority: 'MEDIUM',
      last_message_at: now,
      messages: [
        {
          ...meta,
          body_html: input.body_html || '',
          body_text: bodyText,
          attachments: input.attachments ?? [],
        },
      ],
    });

    const pub = await toPub(doc);
    emitToSupportAgents('ticket:new', pub);
    return pub;
  },

  async replyToTicket(
    actorId: string,
    isAgent: boolean,
    input: { ticket_id: string; body_html?: string; body_text: string; attachments?: string[] }
  ) {
    if (!Types.ObjectId.isValid(input.ticket_id)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const bodyText = (input.body_text || '').trim();
    if (!bodyText) fail('BAD_USER_INPUT', 'Reply text is required');
    const doc = await TicketModel.findById(input.ticket_id);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    if (!isAgent && String(doc!.user_id) !== String(actorId)) {
      fail('FORBIDDEN', 'Cannot reply to another user’s ticket');
    }

    const meta = await actorMeta(actorId, isAgent ? 'AGENT' : 'USER');
    doc!.messages.push({
      ...meta,
      body_html: input.body_html || '',
      body_text: bodyText,
      attachments: input.attachments ?? [],
    } as any);
    doc!.last_message_at = new Date();
    // An agent reply moves an OPEN ticket to PENDING (waiting on the user);
    // a user reply re-opens a PENDING ticket.
    if (isAgent && doc!.status === 'OPEN') doc!.status = 'PENDING';
    else if (!isAgent && doc!.status === 'PENDING') doc!.status = 'OPEN';
    await doc!.save();

    const pub = await toPub(doc!);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  async updateStatus(ticketId: string, status: TicketStatus) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    doc!.status = status;
    await doc!.save();
    const pub = await toPub(doc!);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  async assign(ticketId: string, assigneeId: string | null) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    if (assigneeId && !Types.ObjectId.isValid(assigneeId)) fail('BAD_USER_INPUT', 'Invalid assignee_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    doc!.assignee_id = assigneeId ? new Types.ObjectId(assigneeId) : null;
    await doc!.save();
    const pub = await toPub(doc!);
    emitToSupportAgents('ticket:update', pub);
    return pub;
  },

  async list(opts: { status?: TicketStatus; assigneeId?: string; search?: string; limit?: number }) {
    const q: any = {};
    if (opts.status) q.status = opts.status;
    if (opts.assigneeId && Types.ObjectId.isValid(opts.assigneeId)) {
      q.assignee_id = new Types.ObjectId(opts.assigneeId);
    }
    if (opts.search) q.subject = { $regex: opts.search.trim(), $options: 'i' };
    const docs = await TicketModel.find(q)
      .sort({ last_message_at: -1 })
      .limit(Math.min(200, Math.max(1, opts.limit ?? 100)));
    return Promise.all(docs.map(toPub));
  },

  async getById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    const doc = await TicketModel.findById(id);
    return doc ? toPub(doc) : null;
  },

  async listMine(userId: string) {
    const docs = await TicketModel.find({ user_id: new Types.ObjectId(userId) }).sort({
      last_message_at: -1,
    });
    return Promise.all(docs.map(toPub));
  },
};
