import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { TicketModel, type ITicket, type TicketStatus, type TicketCategory, type TicketPriority } from './ticket.model';
import { UserModel } from '@modules/access/user/user.model';
import { emitToSupportAgents, emitToSupportUser } from '@modules/support/supportChat/supportChat.socket';
import { reopenDeadline, reopenExpired } from '@modules/support/reopenWindow';
import { ticketNo } from '@modules/support/supportChat/unifiedTickets.service';
import { sendHtmlEmail } from '@services/email/email.service';
import {
  buildTranscriptArtifact,
  type TranscriptData,
  type TranscriptFormat,
} from '@modules/support/transcript';
import { paginateDocs, supportSearchRegex } from '@modules/support/support.pagination';

const TICKET_SORTABLE = new Set([
  'last_message_at',
  'created_at',
  'status',
  'priority',
  'subject',
]);

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

const REOPEN_EXPIRED_MSG = 'This ticket can no longer be reopened — the 3-day window has passed. Please raise a new ticket.';

/** Statuses a user reply should re-open back to OPEN (they still have a question). */
const USER_REOPENS = new Set<TicketStatus>(['PENDING', 'RESOLVED', 'CLOSED']);

/** Empty actor used when a ticket's user/assignee can't be resolved. */
const EMPTY_ACTOR_EXTRAS = {
  email: null as string | null,
  city: null as string | null,
  state: null as string | null,
  country: null as string | null,
  joined_at: null as string | null,
  is_email_verified: false,
  is_phone_verified: false,
};

async function buildActor(userId: Types.ObjectId | string | null | undefined) {
  if (!userId) return null;
  const u = await UserModel.findById(userId).select(
    'profile.first_name profile.last_name profile.profile_photo profile.city profile.state profile.country auth.email auth.is_email_verified auth.phone.number auth.phone.extension auth.phone.is_verified metadata.created_at'
  );
  if (!u) return null;
  const num = u.auth?.phone?.number || '';
  const ext = u.auth?.phone?.extension
    ? `+${String(u.auth.phone.extension).replace(/^\+/, '')}`
    : '';
  const created = (u as any).metadata?.created_at as Date | undefined;
  return {
    id: String(u._id),
    name: `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || 'User',
    email: u.auth?.email ?? null,
    phone: num ? `${ext}${num}` : null,
    avatar_url: u.profile?.profile_photo ?? null,
    city: u.profile?.city ?? null,
    state: u.profile?.state ?? null,
    country: u.profile?.country ?? null,
    joined_at: created ? created.toISOString() : null,
    is_email_verified: !!u.auth?.is_email_verified,
    is_phone_verified: !!u.auth?.phone?.is_verified,
  };
}

async function toPub(doc: ITicket) {
  const [user, assignee] = await Promise.all([
    buildActor(doc.user_id),
    doc.assignee_id ? buildActor(doc.assignee_id) : null,
  ]);
  return {
    id: String(doc._id),
    ticket_no: ticketNo('ST', doc._id as Types.ObjectId),
    user: user ?? {
      id: String(doc.user_id),
      name: 'User',
      phone: null,
      avatar_url: null,
      ...EMPTY_ACTOR_EXTRAS,
    },
    subject: doc.subject,
    category: doc.category,
    pod_id: doc.pod_id ? String(doc.pod_id) : null,
    pod_title: doc.pod_title ?? '',
    status: doc.status,
    priority: doc.priority,
    assignee_id: doc.assignee_id ? String(doc.assignee_id) : null,
    assignee_name: assignee?.name ?? null,
    last_message_at: doc.last_message_at?.toISOString?.() ?? '',
    resolved_at: doc.resolved_at ? doc.resolved_at.toISOString() : null,
    reopen_deadline: reopenDeadline(doc.resolved_at)?.toISOString() ?? null,
    rating: doc.rating ?? null,
    feedback_comment: doc.feedback_comment || null,
    feedback_at: doc.feedback_at?.toISOString?.() ?? null,
    user_last_read_at: doc.user_last_read_at?.toISOString?.() ?? null,
    agent_last_read_at: doc.agent_last_read_at?.toISOString?.() ?? null,
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
  const fallbackName = role === 'AGENT' ? 'Support' : 'User';
  return {
    author_id: new Types.ObjectId(userId),
    author_role: role,
    author_name: u
      ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() || fallbackName
      : fallbackName,
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
      pod_id?: string | null;
      pod_title?: string | null;
    }
  ) {
    const subject = (input.subject || '').trim();
    const bodyText = (input.body_text || '').trim();
    if (!subject) fail('BAD_USER_INPUT', 'Subject is required');
    if (!bodyText) fail('BAD_USER_INPUT', 'Message is required');

    const meta = await actorMeta(userId, 'USER');
    const now = new Date();
    const podId = input.pod_id && Types.ObjectId.isValid(input.pod_id) ? new Types.ObjectId(input.pod_id) : null;
    const doc = await TicketModel.create({
      user_id: new Types.ObjectId(userId),
      subject,
      category: input.category ?? 'GENERAL',
      pod_id: podId,
      pod_title: (input.pod_title || '').trim(),
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
    // A user reply re-opens a resolved/closed ticket, but only within the 3-day window.
    if (!isAgent && (doc!.status === 'RESOLVED' || doc!.status === 'CLOSED') && reopenExpired(doc!.resolved_at)) {
      fail('BAD_USER_INPUT', REOPEN_EXPIRED_MSG);
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
    // a user reply re-opens a pending/resolved/closed ticket so they can keep
    // the conversation going (Bug 3: question a resolved/closed ticket).
    if (isAgent && doc!.status === 'OPEN') {
      doc!.status = 'PENDING';
    } else if (!isAgent && USER_REOPENS.has(doc!.status)) {
      doc!.status = 'OPEN';
      doc!.resolved_at = null;
    }
    await doc!.save();

    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  /**
   * Mark the thread read for the acting side (B12). Stamps user_last_read_at or
   * agent_last_read_at and pushes the update so the OTHER side's Sent ticks flip
   * to Seen live. Owner-or-agent only (mirrors replyToTicket's guard).
   */
  async markRead(actorId: string, isAgent: boolean, ticketId: string) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    if (!isAgent && String(doc!.user_id) !== String(actorId)) {
      fail('FORBIDDEN', 'Cannot read another user’s ticket');
    }
    const now = new Date();
    if (isAgent) doc!.agent_last_read_at = now;
    else doc!.user_last_read_at = now;
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  async updateStatus(ticketId: string, status: TicketStatus) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    doc!.status = status;
    // Stamp/clear the resolution time that drives the 3-day reopen window.
    doc!.resolved_at = status === 'RESOLVED' || status === 'CLOSED' ? new Date() : null;
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  /**
   * Agent-set ticket priority (High/Medium/Low). Emits ticket:update to both the
   * agents room and the owner so the user's ticket detail + the Tickets table
   * reflect the new flag live.
   */
  async updatePriority(ticketId: string, priority: TicketPriority) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    doc!.priority = priority;
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  async reopen(actorId: string, isAgent: boolean, ticketId: string, reason?: string | null) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    if (!isAgent && String(doc!.user_id) !== String(actorId)) {
      fail('FORBIDDEN', 'Cannot reopen another user’s ticket');
    }
    // Users may only reopen within the 3-day window; agents are unrestricted.
    if (!isAgent && (doc!.status === 'RESOLVED' || doc!.status === 'CLOSED') && reopenExpired(doc!.resolved_at)) {
      fail('BAD_USER_INPUT', REOPEN_EXPIRED_MSG);
    }
    // Log the reopen (with reason) into the thread for history.
    const meta = await actorMeta(actorId, isAgent ? 'AGENT' : 'USER');
    const trimmed = (reason || '').trim();
    doc!.messages.push({
      ...meta,
      body_text: trimmed ? `Re-opened this ticket. Reason: ${trimmed}` : 'Re-opened this ticket.',
      attachments: [],
    } as any);
    doc!.status = 'OPEN';
    doc!.resolved_at = null;
    doc!.last_message_at = new Date();
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  /**
   * Mark a ticket RESOLVED — allowed by the owner OR an agent (mirrors the
   * reopen guard). Stamps resolved_at, appends a SYSTEM timeline bubble and
   * emits the ticket update. Leaves richer status transitions to updateStatus.
   */
  async resolve(actorId: string, isAgent: boolean, ticketId: string) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    if (!isAgent && String(doc!.user_id) !== String(actorId)) {
      fail('FORBIDDEN', 'Cannot resolve another user’s ticket');
    }
    const meta = await actorMeta(actorId, isAgent ? 'AGENT' : 'USER');
    doc!.status = 'RESOLVED';
    doc!.resolved_at = new Date();
    doc!.last_message_at = new Date();
    doc!.messages.push({
      author_id: meta.author_id,
      author_role: 'SYSTEM',
      author_name: meta.author_name,
      author_photo: meta.author_photo,
      body_text: `Ticket marked resolved by ${meta.author_name}.`,
      attachments: [],
    } as any);
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  /**
   * Owner-only satisfaction feedback on a resolved/closed ticket. One-time:
   * a ticket that already has a rating cannot be re-rated.
   */
  async submitFeedback(
    actorId: string,
    ticketId: string,
    input: { rating: number; comment?: string }
  ) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    if (input.rating < 1 || input.rating > 5) fail('BAD_USER_INPUT', 'Rating must be 1-5');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    if (String(doc!.user_id) !== String(actorId)) fail('FORBIDDEN', 'Not your ticket');
    if (doc!.status !== 'RESOLVED' && doc!.status !== 'CLOSED') {
      fail('BAD_USER_INPUT', 'Ticket must be resolved before feedback');
    }
    if (doc!.rating != null) fail('BAD_USER_INPUT', 'Feedback already submitted');
    doc!.rating = input.rating;
    doc!.feedback_comment = (input.comment ?? '').trim();
    doc!.feedback_at = new Date();
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    emitToSupportUser(String(doc!.user_id), 'ticket:update', pub);
    return pub;
  },

  async buildTranscript(ticketId: string): Promise<TranscriptData> {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    const no = ticketNo('ST', doc!._id as Types.ObjectId);
    const user = await buildActor(doc!.user_id);
    const userName = user?.name ?? 'User';
    const lines = doc!.messages.map((m) => {
      let who: string;
      if (m.author_role === 'USER') who = userName || 'You';
      else if (m.author_role === 'SYSTEM') who = 'System';
      else who = m.author_name || 'Support';
      const body =
        m.body_text || (m.attachments?.length ? `[${m.attachments.length} attachment(s)]` : '');
      return { who, when: m.created_at?.toISOString?.() ?? '', body };
    });
    const phoneSuffix = user?.phone ? ` (${user.phone})` : '';
    return {
      title: 'Duncit — Support ticket transcript',
      no,
      header: [
        { label: 'Ticket', value: no },
        { label: 'Subject', value: doc!.subject || '' },
        { label: 'User', value: `${userName}${phoneSuffix}` },
        { label: 'Status', value: doc!.status },
        { label: 'Started', value: doc!.created_at?.toISOString?.() ?? '' },
        { label: 'Generated', value: new Date().toISOString() },
      ],
      lines,
    };
  },

  async transcript(ticketId: string, format: TranscriptFormat = 'TXT') {
    const data = await this.buildTranscript(ticketId);
    const { filename, text, content_base64 } = await buildTranscriptArtifact(data, format);
    return { filename, text, content_base64 };
  },

  async emailTranscript(ticketId: string, email: string, format: TranscriptFormat = 'DOCX') {
    const addr = (email || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(addr)) fail('BAD_USER_INPUT', 'A valid email is required');
    const data = await this.buildTranscript(ticketId);
    const artifact = await buildTranscriptArtifact(data, format);
    await sendHtmlEmail({
      to: addr,
      subject: `Your Duncit support ticket transcript (${data.no})`,
      html: `<p>Hi,</p><p>Your Duncit support ticket <b>${data.no}</b> transcript is attached.</p><p>— Team Duncit</p>`,
      attachments: [
        {
          filename: artifact.filename,
          content: Buffer.from(artifact.content_base64, 'base64'),
          contentType: artifact.content_type,
        },
      ],
    });
    return true;
  },

  async assign(ticketId: string, assigneeId: string | null) {
    if (!Types.ObjectId.isValid(ticketId)) fail('BAD_USER_INPUT', 'Invalid ticket_id');
    if (assigneeId && !Types.ObjectId.isValid(assigneeId)) fail('BAD_USER_INPUT', 'Invalid assignee_id');
    const doc = await TicketModel.findById(ticketId);
    if (!doc) fail('NOT_FOUND', 'Ticket not found');
    doc!.assignee_id = assigneeId ? new Types.ObjectId(assigneeId) : null;
    await doc!.save();
    const pub = await toPub(doc);
    emitToSupportAgents('ticket:update', pub);
    return pub;
  },

  async list(opts: {
    status?: TicketStatus;
    assigneeId?: string;
    search?: string;
    page?: number | null;
    page_size?: number | null;
    sort_by?: string | null;
    sort_dir?: string | null;
  }) {
    const q: any = {};
    if (opts.status) q.status = opts.status;
    if (opts.assigneeId && Types.ObjectId.isValid(opts.assigneeId)) {
      q.assignee_id = new Types.ObjectId(opts.assigneeId);
    }
    if (opts.search) q.subject = supportSearchRegex(opts.search);
    const { docs, total, page, page_size } = await paginateDocs<ITicket>(
      TicketModel,
      q,
      opts,
      TICKET_SORTABLE,
      { last_message_at: -1 }
    );
    const items = await Promise.all(docs.map(toPub));
    return { items, total, page, page_size };
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
