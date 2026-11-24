import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { escapeRegexLiteral } from '@utils/vet-regex';
import { INTEL_ENV_CHOICES, INTEL_SOURCES, type IntelEnvChoice } from '../intel.constants';
import { IntelConversationModel, IntelMessageModel, type IIntelConversation, type IIntelMessage } from './intelChat.models';

/**
 * The person's own chat history. Every query carries `owner_id` — the one rule
 * that keeps chats private — and a conversation of someone else answers
 * NOT_FOUND, never FORBIDDEN, so its existence is not revealed either.
 */

export type ConversationView = 'RECENT' | 'PINNED' | 'ARCHIVED' | 'ALL';
export type ConversationSort = 'RECENT' | 'TITLE' | 'CREATED';

const notFound = () => new GraphQLError('Conversation not found', { extensions: { code: 'NOT_FOUND' } });
const oid = (id: string) => new Types.ObjectId(id);

export const toConversationDto = (c: IIntelConversation) => ({
  id: String(c._id),
  title: c.title,
  pinned: c.pinned,
  archived: c.archived,
  model: c.model,
  environment: c.environment,
  sources: c.sources,
  message_count: c.message_count,
  last_message_at: c.last_message_at,
  created_at: c.created_at,
  updated_at: c.updated_at,
});

export const toMessageDto = (m: IIntelMessage) => ({
  id: String(m._id),
  conversation_id: String(m.conversation_id),
  role: m.role,
  content: m.content,
  status: m.status,
  citations: m.citations,
  tool_calls: m.tool_calls,
  approval_ids: m.approval_ids,
  model: m.model,
  error_code: m.error_code || null,
  error_message: m.error_message || null,
  edited: m.edit_history.length > 0,
  attachments: (m.attachments ?? []).map((a) => ({ id: a.media_id, name: a.name, mime: a.mime })),
  created_at: m.created_at,
});

function viewFilter(view: ConversationView): Record<string, unknown> {
  if (view === 'PINNED') return { pinned: true, archived: false };
  if (view === 'ARCHIVED') return { archived: true };
  if (view === 'RECENT') return { archived: false };
  return {};
}

const SORTS: Record<ConversationSort, Record<string, 1 | -1>> = {
  RECENT: { pinned: -1, last_message_at: -1 },
  TITLE: { title: 1, _id: 1 },
  CREATED: { created_at: -1 },
};

export const sanitizeSources = (sources: readonly string[] | null | undefined): string[] =>
  [...new Set((sources ?? []).filter((s) => (INTEL_SOURCES as readonly string[]).includes(s)))];

export const sanitizeEnvironment = (env: string | null | undefined, fallback: IntelEnvChoice): IntelEnvChoice =>
  (INTEL_ENV_CHOICES as readonly string[]).includes(env ?? '') ? (env as IntelEnvChoice) : fallback;

export const intelConversations = {
  async list(ownerId: string, args: { view?: ConversationView | null; sort?: ConversationSort | null; search?: string | null; page?: number | null; page_size?: number | null }) {
    const filter: Record<string, unknown> = { owner_id: oid(ownerId), deleted_at: null, ...viewFilter(args.view ?? 'RECENT') };
    const term = args.search?.trim().slice(0, 100);
    if (term) {
      const rx = new RegExp(escapeRegexLiteral(term), 'i');
      const inMessages = await IntelMessageModel.distinct('conversation_id', { owner_id: oid(ownerId), superseded: false, content: rx });
      filter.$or = [{ title: rx }, { _id: { $in: inMessages.slice(0, 500) } }];
    }
    const pageSize = Math.min(Math.max(args.page_size ?? 30, 1), 100);
    const page = Math.max(args.page ?? 1, 1);
    const [rows, total] = await Promise.all([
      IntelConversationModel.find(filter).sort(SORTS[args.sort ?? 'RECENT']).skip((page - 1) * pageSize).limit(pageSize).lean(),
      IntelConversationModel.countDocuments(filter),
    ]);
    return { total, rows: rows.map(toConversationDto) };
  },

  async counts(ownerId: string) {
    const base = { owner_id: oid(ownerId), deleted_at: null };
    const [recent, pinned, archived, all] = await Promise.all([
      IntelConversationModel.countDocuments({ ...base, archived: false }),
      IntelConversationModel.countDocuments({ ...base, archived: false, pinned: true }),
      IntelConversationModel.countDocuments({ ...base, archived: true }),
      IntelConversationModel.countDocuments(base),
    ]);
    return { recent, pinned, archived, all };
  },

  async own(ownerId: string, id: string): Promise<IIntelConversation> {
    if (!Types.ObjectId.isValid(id)) throw notFound();
    const c = await IntelConversationModel.findOne({ _id: id, owner_id: oid(ownerId), deleted_at: null }).lean();
    if (!c) throw notFound();
    return c;
  },

  async get(ownerId: string, id: string) {
    return toConversationDto(await this.own(ownerId, id));
  },

  async messages(ownerId: string, id: string) {
    const c = await this.own(ownerId, id);
    const rows = await IntelMessageModel.find({ conversation_id: c._id, owner_id: oid(ownerId), superseded: false }).sort({ created_at: 1 }).limit(500).lean();
    return rows.map(toMessageDto);
  },

  async create(ownerId: string, init: { model: string; environment: IntelEnvChoice; sources: string[] }) {
    const created = await IntelConversationModel.create({ owner_id: oid(ownerId), ...init });
    return created.toObject();
  },

  async update(ownerId: string, id: string, patch: { title?: string | null; pinned?: boolean | null; archived?: boolean | null; model?: string | null; environment?: string | null; sources?: string[] | null }) {
    const c = await this.own(ownerId, id);
    const set: Record<string, unknown> = {};
    if (patch.title?.trim()) Object.assign(set, { title: patch.title.trim().slice(0, 120), title_generated: true });
    if (typeof patch.pinned === 'boolean') set.pinned = patch.pinned;
    if (typeof patch.archived === 'boolean') set.archived = patch.archived;
    if (patch.model?.trim()) set.model = patch.model.trim().slice(0, 80);
    if (patch.environment) set.environment = sanitizeEnvironment(patch.environment, c.environment);
    if (patch.sources) set.sources = sanitizeSources(patch.sources);
    const updated = await IntelConversationModel.findOneAndUpdate({ _id: c._id, owner_id: oid(ownerId) }, { $set: set }, { new: true }).lean();
    return toConversationDto(updated ?? c);
  },

  /** Soft delete: gone from every list at once, purged with its messages. */
  async remove(ownerId: string, id: string): Promise<boolean> {
    const c = await this.own(ownerId, id);
    await IntelConversationModel.updateOne({ _id: c._id, owner_id: oid(ownerId) }, { $set: { deleted_at: new Date() } });
    await IntelMessageModel.deleteMany({ conversation_id: c._id, owner_id: oid(ownerId) });
    return true;
  },
};
