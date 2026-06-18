import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  SupportChatSessionModel,
  SupportChatMessageModel,
  type ISupportChatSession,
  type ISupportChatMessage,
  type SupportChatStatus,
} from './supportChat.model';
import { UserModel } from '@modules/access/user/user.model';
import { emitToSupportAgents, emitToSupportUser, emitToSupportSession } from './supportChat.socket';
import { ticketNo } from './unifiedTickets.service';
import { aiSupportReply, isOpenAiConfigured, type SupportAiTurn } from './supportChat.ai';
import { sendHtmlEmail } from '@services/email/email.service';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

/** Sentinel author id for AI / system-bot bubbles that have no human sender. */
const AI_SENDER_ID = new Types.ObjectId('000000000000000000000000');
const AI_NAME = 'Duncit Assistant';
const AI_GREETING =
  "Hi! 👋 I'm the Duncit Assistant. Tell me what you need help with and I'll do my best — or connect you to our support team.";
const HANDOFF_NOTICE =
  "I'm connecting you to a support executive who specialises in your concern for a quicker resolution. They'll be with you shortly.";

async function buildUser(userId: Types.ObjectId | string) {
  const u = await UserModel.findById(userId).select(
    'profile.first_name profile.last_name profile.profile_photo auth.phone.number auth.phone.extension'
  );
  if (!u) return { id: String(userId), name: 'User', phone: null, avatar_url: null };
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

async function senderMeta(userId: string) {
  const u = await UserModel.findById(userId).select(
    'profile.first_name profile.last_name profile.profile_photo'
  );
  return {
    name: u ? `${u.profile?.first_name ?? ''} ${u.profile?.last_name ?? ''}`.trim() : '',
    photo: u?.profile?.profile_photo || '',
  };
}

async function sessionPub(doc: ISupportChatSession) {
  return {
    id: String(doc._id),
    ticket_no: ticketNo('CH', doc._id as Types.ObjectId),
    user: await buildUser(doc.user_id),
    agent_id: doc.agent_id ? String(doc.agent_id) : null,
    status: doc.status,
    last_message_at: doc.last_message_at?.toISOString?.() ?? '',
    last_message_preview: doc.last_message_preview || '',
    unread_for_agent: doc.unread_for_agent || 0,
    unread_for_user: doc.unread_for_user || 0,
    user_last_read_at: doc.user_last_read_at?.toISOString?.() ?? null,
    agent_last_read_at: doc.agent_last_read_at?.toISOString?.() ?? null,
    ai_active: doc.ai_active !== false,
    handed_off: !!doc.handed_off,
    rating: doc.rating ?? null,
    feedback_comment: doc.feedback_comment || null,
    feedback_at: doc.feedback_at?.toISOString?.() ?? null,
    created_at: doc.created_at?.toISOString?.() ?? '',
    updated_at: doc.updated_at?.toISOString?.() ?? '',
  };
}

function messagePub(doc: ISupportChatMessage) {
  return {
    id: String(doc._id),
    session_id: String(doc.session_id),
    sender_id: String(doc.sender_id),
    sender_role: doc.sender_role,
    sender_name: doc.sender_name || '',
    sender_photo: doc.sender_photo || null,
    text: doc.text || '',
    attachments: doc.attachments || [],
    is_ai: !!doc.is_ai,
    created_at: doc.created_at?.toISOString?.() ?? '',
  };
}

export const supportChatService = {
  async canAccessSession(sessionId: string, userId: string, isAgent: boolean): Promise<boolean> {
    if (!Types.ObjectId.isValid(sessionId)) return false;
    if (isAgent) return true;
    const s = await SupportChatSessionModel.findById(sessionId).select('user_id').lean();
    return !!s && String(s.user_id) === String(userId);
  },

  async getMine(userId: string) {
    // The latest thread regardless of status, so a user can re-open a chat they
    // previously resolved (Bug 12) rather than always starting a fresh one.
    const doc = await SupportChatSessionModel.findOne({
      user_id: new Types.ObjectId(userId),
    }).sort({ last_message_at: -1 });
    return doc ? sessionPub(doc) : null;
  },

  async start(userId: string, text?: string) {
    let doc = await SupportChatSessionModel.findOne({
      user_id: new Types.ObjectId(userId),
      status: 'OPEN',
    }).sort({ last_message_at: -1 });
    if (!doc) {
      // Chat with Us is AI-first only when an OpenAI key is configured; without
      // one it falls back to the plain human-agent flow (no greeting, no bot).
      const aiConfigured = await isOpenAiConfigured();
      doc = await SupportChatSessionModel.create({
        user_id: new Types.ObjectId(userId),
        status: 'OPEN',
        ai_active: aiConfigured,
        last_message_at: new Date(),
        last_message_preview: '',
      });
      const pub = await sessionPub(doc);
      emitToSupportAgents('support_chat:session_new', pub);
      if (aiConfigured) {
        await this.appendBubble(doc, {
          senderId: AI_SENDER_ID,
          role: 'AGENT',
          isAi: true,
          name: AI_NAME,
          text: AI_GREETING,
        });
      }
    }
    const trimmed = (text || '').trim();
    if (trimmed) {
      await this.sendMessage(userId, false, { sessionId: String(doc._id), text: trimmed });
      doc = (await SupportChatSessionModel.findById(doc._id))!;
    }
    return sessionPub(doc);
  },

  /**
   * Assign an agent to a session the first time they engage, announced as a
   * SYSTEM chat bubble ("Picked up by <agent>") so the user sees who's helping.
   * No-op when the session already has an agent.
   */
  async claim(sessionId: string, agentId: string) {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    if (!session!.agent_id) {
      session!.agent_id = new Types.ObjectId(agentId);
      const meta = await senderMeta(agentId);
      const sysMsg = await SupportChatMessageModel.create({
        session_id: session!._id,
        sender_id: new Types.ObjectId(agentId),
        sender_role: 'SYSTEM',
        sender_name: meta.name,
        sender_photo: meta.photo,
        text: `Picked up by ${meta.name || 'a support agent'}`,
        attachments: [],
      });
      session!.last_message_at = new Date();
      session!.last_message_preview = sysMsg.text;
      await session!.save();
      const pubSession = await sessionPub(session!);
      emitToSupportSession(String(session!._id), 'support_chat:message', messagePub(sysMsg));
      emitToSupportAgents('support_chat:session_update', pubSession);
      emitToSupportUser(String(session!.user_id), 'support_chat:session_update', pubSession);
    }
    return sessionPub(session!);
  },

  async sendMessage(
    senderId: string,
    isAgent: boolean,
    input: { sessionId: string; text?: string; attachments?: string[] }
  ) {
    if (!Types.ObjectId.isValid(input.sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const text = (input.text || '').trim();
    const attachments = input.attachments ?? [];
    if (!text && attachments.length === 0) fail('BAD_USER_INPUT', 'Message text or attachment required');

    let session = await SupportChatSessionModel.findById(input.sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    if (!isAgent && String(session!.user_id) !== String(senderId)) {
      fail('FORBIDDEN', 'Cannot post to another user’s chat');
    }

    // First agent engagement claims the session and announces "Picked up by …"
    // as a SYSTEM bubble before the agent's own message lands.
    if (isAgent && !session!.agent_id) {
      await this.claim(input.sessionId, senderId);
      session = (await SupportChatSessionModel.findById(input.sessionId))!;
    }

    const meta = await senderMeta(senderId);
    const msg = await SupportChatMessageModel.create({
      session_id: session!._id,
      sender_id: new Types.ObjectId(senderId),
      sender_role: isAgent ? 'AGENT' : 'USER',
      sender_name: meta.name,
      sender_photo: meta.photo,
      text,
      attachments,
    });

    session!.last_message_at = new Date();
    session!.last_message_preview = text || '📎 Attachment';
    const aiHandling = session!.ai_active !== false && !session!.agent_id;
    if (isAgent) {
      if (!session!.agent_id) session!.agent_id = new Types.ObjectId(senderId);
      session!.unread_for_user = (session!.unread_for_user || 0) + 1;
    } else {
      // While the AI is fielding the chat, don't surface it to human agents
      // until it decides to hand off — keeps the agent inbox clean.
      if (!aiHandling) session!.unread_for_agent = (session!.unread_for_agent || 0) + 1;
      // A user message re-opens a closed session.
      if (session!.status === 'CLOSED') session!.status = 'OPEN';
    }
    await session!.save();

    const pubMsg = messagePub(msg);
    const pubSession = await sessionPub(session!);
    emitToSupportSession(String(session!._id), 'support_chat:message', pubMsg);
    emitToSupportAgents('support_chat:session_update', pubSession);
    emitToSupportUser(String(session!.user_id), 'support_chat:session_update', pubSession);

    // The send returns immediately; the AI reply is produced out-of-band and
    // delivered over the socket so the user never waits on the model.
    if (!isAgent && aiHandling) {
      this.generateAiReply(String(session!._id)).catch((e) =>
        console.error('[supportChat] AI reply failed', e)
      );
    }
    return pubMsg;
  },

  async listSessions(status?: SupportChatStatus) {
    const q: any = {};
    if (status) q.status = status;
    const docs = await SupportChatSessionModel.find(q).sort({ last_message_at: -1 }).limit(200);
    return Promise.all(docs.map(sessionPub));
  },

  async listMessages(sessionId: string, limit = 50, before?: string) {
    if (!Types.ObjectId.isValid(sessionId)) return [];
    const q: any = { session_id: new Types.ObjectId(sessionId) };
    if (before) q.created_at = { $lt: new Date(before) };
    const docs = await SupportChatMessageModel.find(q)
      .sort({ created_at: -1 })
      .limit(Math.min(200, Math.max(1, limit)));
    return docs.reverse().map(messagePub);
  },

  async close(sessionId: string) {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    session!.status = 'CLOSED';
    await session!.save();
    const pub = await sessionPub(session!);
    emitToSupportAgents('support_chat:session_update', pub);
    emitToSupportUser(String(session!.user_id), 'support_chat:session_update', pub);
    return pub;
  },

  async markRead(sessionId: string, isAgent: boolean) {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    const now = new Date();
    if (isAgent) {
      session!.unread_for_agent = 0;
      session!.agent_last_read_at = now;
    } else {
      session!.unread_for_user = 0;
      session!.user_last_read_at = now;
    }
    await session!.save();
    // Push the read state so the other side's "Seen" (blue) ticks update live.
    const pub = await sessionPub(session!);
    emitToSupportSession(String(session!._id), 'support_chat:session_update', pub);
    emitToSupportAgents('support_chat:session_update', pub);
    emitToSupportUser(String(session!.user_id), 'support_chat:session_update', pub);
    return pub;
  },

  /**
   * Create one chat bubble, refresh the session's preview/timestamp and fan it
   * out to the session room + both inboxes. Used for AI, system and bot bubbles.
   */
  async appendBubble(
    session: ISupportChatSession,
    opts: {
      senderId: Types.ObjectId;
      role: 'USER' | 'AGENT' | 'SYSTEM';
      isAi?: boolean;
      name: string;
      photo?: string;
      text: string;
      attachments?: string[];
      incrementUnreadForUser?: boolean;
    }
  ) {
    const msg = await SupportChatMessageModel.create({
      session_id: session._id,
      sender_id: opts.senderId,
      sender_role: opts.role,
      sender_name: opts.name,
      sender_photo: opts.photo || '',
      text: opts.text,
      attachments: opts.attachments ?? [],
      is_ai: !!opts.isAi,
    });
    session.last_message_at = new Date();
    session.last_message_preview = opts.text || '📎 Attachment';
    if (opts.incrementUnreadForUser) {
      session.unread_for_user = (session.unread_for_user || 0) + 1;
    }
    await session.save();
    const pubMsg = messagePub(msg);
    const pubSession = await sessionPub(session);
    emitToSupportSession(String(session._id), 'support_chat:message', pubMsg);
    emitToSupportAgents('support_chat:session_update', pubSession);
    emitToSupportUser(String(session.user_id), 'support_chat:session_update', pubSession);
    return msg;
  },

  /**
   * Produce the AI assistant's next reply for a session it is still fielding.
   * Posts the reply (when any) and, on an out-of-scope/handoff decision, flips
   * the session to a human and announces the transfer as a SYSTEM bubble.
   */
  async generateAiReply(sessionId: string) {
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) return;
    if (session.agent_id || session.ai_active === false) return; // a human took over

    const msgs = await SupportChatMessageModel.find({ session_id: session._id })
      .sort({ created_at: 1 })
      .limit(40);
    const history: SupportAiTurn[] = [];
    for (const m of msgs) {
      if (m.sender_role === 'USER') history.push({ role: 'user', content: m.text || '' });
      else if (m.sender_role === 'AGENT') history.push({ role: 'assistant', content: m.text || '' });
    }
    if (!history.some((h) => h.role === 'user')) return;

    const { reply, handoff } = await aiSupportReply(history);
    if (reply) {
      await this.appendBubble(session, {
        senderId: AI_SENDER_ID,
        role: 'AGENT',
        isAi: true,
        name: AI_NAME,
        text: reply,
        incrementUnreadForUser: true,
      });
    }
    if (handoff) {
      session.ai_active = false;
      session.handed_off = true;
      session.unread_for_agent = (session.unread_for_agent || 0) + 1;
      await this.appendBubble(session, {
        senderId: AI_SENDER_ID,
        role: 'SYSTEM',
        name: AI_NAME,
        text: HANDOFF_NOTICE,
      });
    }
  },

  async resolve(sessionId: string, byLabel = 'the user') {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    session!.status = 'CLOSED';
    await this.appendBubble(session!, {
      senderId: AI_SENDER_ID,
      role: 'SYSTEM',
      name: AI_NAME,
      text: `Chat marked resolved by ${byLabel}.`,
    });
    return sessionPub(session!);
  },

  async reopen(sessionId: string, byLabel = 'the user') {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    session!.status = 'OPEN';
    // Resurface to a human if one was already in the loop.
    if (session!.agent_id || session!.handed_off) {
      session!.unread_for_agent = (session!.unread_for_agent || 0) + 1;
    }
    await this.appendBubble(session!, {
      senderId: AI_SENDER_ID,
      role: 'SYSTEM',
      name: AI_NAME,
      text: `Chat re-opened by ${byLabel}.`,
    });
    return sessionPub(session!);
  },

  async submitFeedback(
    sessionId: string,
    userId: string,
    input: { rating: number; comment?: string }
  ) {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    if (input.rating < 1 || input.rating > 5) fail('BAD_USER_INPUT', 'Rating must be 1-5');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    if (String(session!.user_id) !== String(userId)) fail('FORBIDDEN', 'Not your chat');
    session!.rating = input.rating;
    session!.feedback_comment = (input.comment ?? '').trim();
    session!.feedback_at = new Date();
    await session!.save();
    const pub = await sessionPub(session!);
    emitToSupportAgents('support_chat:session_update', pub);
    return pub;
  },

  async buildTranscript(sessionId: string) {
    if (!Types.ObjectId.isValid(sessionId)) fail('BAD_USER_INPUT', 'Invalid session_id');
    const session = await SupportChatSessionModel.findById(sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    const no = ticketNo('CH', session!._id as Types.ObjectId);
    const [user, msgs] = await Promise.all([
      buildUser(session!.user_id),
      SupportChatMessageModel.find({ session_id: session!._id }).sort({ created_at: 1 }),
    ]);
    const header = [
      'Duncit — Support chat transcript',
      `Ticket: ${no}`,
      `User: ${user.name}${user.phone ? ` (${user.phone})` : ''}`,
      `Status: ${session!.status}`,
      `Started: ${session!.created_at?.toISOString?.() ?? ''}`,
      `Generated: ${new Date().toISOString()}`,
      '------------------------------------------------',
      '',
    ];
    const lines = msgs.map((m) => {
      let who: string;
      if (m.sender_role === 'USER') who = user.name || 'You';
      else if (m.sender_role === 'SYSTEM') who = 'System';
      else who = m.is_ai ? AI_NAME : m.sender_name || 'Support';
      const when = m.created_at?.toISOString?.() ?? '';
      const body =
        m.text || (m.attachments?.length ? `[${m.attachments.length} attachment(s)]` : '');
      return `[${when}] ${who}: ${body}`;
    });
    return { session: session!, no, text: [...header, ...lines].join('\n') };
  },

  async transcript(sessionId: string) {
    const { no, text } = await this.buildTranscript(sessionId);
    return {
      filename: `support-${no}.txt`,
      text,
      content_base64: Buffer.from(text, 'utf8').toString('base64'),
    };
  },

  async emailTranscript(sessionId: string, email: string) {
    const addr = (email || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(addr)) fail('BAD_USER_INPUT', 'A valid email is required');
    const { no, text } = await this.buildTranscript(sessionId);
    await sendHtmlEmail({
      to: addr,
      subject: `Your Duncit support chat transcript (${no})`,
      html: `<p>Hi,</p><p>Your Duncit support chat <b>${no}</b> transcript is attached as a text file.</p><p>— Team Duncit</p>`,
      attachments: [{ filename: `support-${no}.txt`, content: text, contentType: 'text/plain' }],
    });
    return true;
  },
};
