import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import {
  SupportChatSessionModel,
  SupportChatMessageModel,
  type ISupportChatSession,
  type ISupportChatMessage,
  type SupportChatStatus,
} from './supportChat.model';
import { UserModel } from '../user/user.model';
import { emitToSupportAgents, emitToSupportUser, emitToSupportSession } from './supportChat.socket';

function fail(code: string, msg: string): never {
  throw new GraphQLError(msg, { extensions: { code } });
}

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
    user: await buildUser(doc.user_id),
    agent_id: doc.agent_id ? String(doc.agent_id) : null,
    status: doc.status,
    last_message_at: doc.last_message_at?.toISOString?.() ?? '',
    last_message_preview: doc.last_message_preview || '',
    unread_for_agent: doc.unread_for_agent || 0,
    unread_for_user: doc.unread_for_user || 0,
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
    const doc = await SupportChatSessionModel.findOne({
      user_id: new Types.ObjectId(userId),
      status: 'OPEN',
    }).sort({ last_message_at: -1 });
    return doc ? sessionPub(doc) : null;
  },

  async start(userId: string, text?: string) {
    let doc = await SupportChatSessionModel.findOne({
      user_id: new Types.ObjectId(userId),
      status: 'OPEN',
    }).sort({ last_message_at: -1 });
    if (!doc) {
      doc = await SupportChatSessionModel.create({
        user_id: new Types.ObjectId(userId),
        status: 'OPEN',
        last_message_at: new Date(),
        last_message_preview: '',
      });
      const pub = await sessionPub(doc);
      emitToSupportAgents('support_chat:session_new', pub);
    }
    const trimmed = (text || '').trim();
    if (trimmed) {
      await this.sendMessage(userId, false, { sessionId: String(doc._id), text: trimmed });
      doc = (await SupportChatSessionModel.findById(doc._id))!;
    }
    return sessionPub(doc);
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

    const session = await SupportChatSessionModel.findById(input.sessionId);
    if (!session) fail('NOT_FOUND', 'Chat session not found');
    if (!isAgent && String(session!.user_id) !== String(senderId)) {
      fail('FORBIDDEN', 'Cannot post to another user’s chat');
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
    if (isAgent) {
      if (!session!.agent_id) session!.agent_id = new Types.ObjectId(senderId);
      session!.unread_for_user = (session!.unread_for_user || 0) + 1;
    } else {
      session!.unread_for_agent = (session!.unread_for_agent || 0) + 1;
      // A user message re-opens a closed session.
      if (session!.status === 'CLOSED') session!.status = 'OPEN';
    }
    await session!.save();

    const pubMsg = messagePub(msg);
    const pubSession = await sessionPub(session!);
    emitToSupportSession(String(session!._id), 'support_chat:message', pubMsg);
    emitToSupportAgents('support_chat:session_update', pubSession);
    emitToSupportUser(String(session!.user_id), 'support_chat:session_update', pubSession);
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
    if (isAgent) session!.unread_for_agent = 0;
    else session!.unread_for_user = 0;
    await session!.save();
    return sessionPub(session!);
  },
};
