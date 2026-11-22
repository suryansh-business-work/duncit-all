import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { z } from 'zod';
import { FaqModel } from '@modules/support/faq/faq.model';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { ASK_DUNCIT_ROLE_KEYS, type AskDuncitRoleKey } from '../askDuncit.constants';
import { recordAudit, type AuditActor } from '../audit/askDuncitAudit.service';
import {
  AskDuncitKnowledgeModel,
  KNOWLEDGE_KINDS,
  KNOWLEDGE_STATUSES,
  type IAskDuncitKnowledge,
} from './askDuncitKnowledge.model';

/**
 * Knowledge retrieval for Ask Duncit: the operator-written knowledge base and
 * SOPs (this module) plus the app's existing FAQs (support/faq), so an answer
 * the support team already wrote is never re-invented by the model.
 *
 * Retrieval is MongoDB full-text search, filtered by status and audience role
 * before ranking — a staff SOP can never be retrieved for a member.
 */

export interface KnowledgePassage {
  id: string;
  title: string;
  body: string;
  source: 'KB' | 'FAQ';
}

const PASSAGE_CHARS = 1200;
const PARTNER_ROLES: ReadonlySet<AskDuncitRoleKey> = new Set(['HOST', 'VENUE_OWNER', 'ECOMM_BRAND']);

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** The few longest words of a question — enough to find a matching FAQ by its wording. */
export function keywordsOf(query: string, max = 3): string[] {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 4);
  return Array.from(new Set(words))
    .sort((a, b) => b.length - a.length)
    .slice(0, max);
}

async function searchKb(query: string, role: AskDuncitRoleKey, limit: number): Promise<KnowledgePassage[]> {
  const rows = await AskDuncitKnowledgeModel.find(
    {
      $text: { $search: query },
      status: 'PUBLISHED',
      $or: [{ audience_roles: { $size: 0 } }, { audience_roles: role }],
    },
    { score: { $meta: 'textScore' }, title: 1, body: 1 }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .lean<Array<Pick<IAskDuncitKnowledge, '_id' | 'title' | 'body'>>>();
  if (rows.length) {
    await AskDuncitKnowledgeModel.updateMany({ _id: { $in: rows.map((r) => r._id) } }, { $inc: { hits: 1 } });
  }
  return rows.map((r) => ({ id: String(r._id), title: r.title, body: r.body.slice(0, PASSAGE_CHARS), source: 'KB' }));
}

async function searchFaqs(query: string, role: AskDuncitRoleKey, limit: number): Promise<KnowledgePassage[]> {
  const words = keywordsOf(query);
  if (!words.length) return [];
  const audiences = PARTNER_ROLES.has(role) ? ['APP', 'PARTNERS'] : ['APP'];
  const rows = await FaqModel.find({
    is_active: true,
    audience: { $in: audiences },
    $or: words.map((word) => ({ question: new RegExp(escapeRegex(word), 'i') })),
  })
    .select('question answer')
    .limit(limit)
    .lean<Array<{ _id: Types.ObjectId; question: string; answer: string }>>();
  return rows.map((r) => ({ id: String(r._id), title: r.question, body: r.answer.slice(0, PASSAGE_CHARS), source: 'FAQ' }));
}

export async function searchKnowledge(query: string, role: AskDuncitRoleKey, limit = 4): Promise<KnowledgePassage[]> {
  const text = query.trim().slice(0, 300);
  if (!text) return [];
  const [kb, faqs] = await Promise.all([searchKb(text, role, limit), searchFaqs(text, role, 2)]);
  return [...kb, ...faqs].slice(0, limit);
}

export const passagesText = (passages: readonly KnowledgePassage[]): string =>
  passages.length ? passages.map((p) => `[${p.title}] (${p.source})\n${p.body}`).join('\n\n') : 'No matching articles.';

/* -------------------------------- operator CRUD -------------------------------- */

const knowledgeInput = z
  .object({
    title: z.string().trim().min(3).max(200),
    body: z.string().trim().min(10).max(20_000),
    kind: z.enum(KNOWLEDGE_KINDS),
    audience_roles: z.array(z.enum(ASK_DUNCIT_ROLE_KEYS)).max(ASK_DUNCIT_ROLE_KEYS.length),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    locale: z.string().trim().max(20),
    status: z.enum(KNOWLEDGE_STATUSES),
  })
  .partial()
  .strict();

export type KnowledgeInput = z.infer<typeof knowledgeInput>;

const TABLE_CONFIG: TableEntityConfig = {
  searchFields: ['title', 'body', 'tags'],
  sortFields: { updated_at: 'updated_at', title: 'title', hits: 'hits', created_at: 'created_at' },
  filterFields: { kind: { type: 'enum' }, status: { type: 'enum' }, locale: { type: 'string' }, created_at: { type: 'date' } },
  defaultSort: { updated_at: -1 },
};

const parse = (input: unknown) => {
  const parsed = knowledgeInput.safeParse(input);
  if (!parsed.success) {
    throw new GraphQLError(parsed.error.issues.map((i) => i.message).join('; '), { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return parsed.data;
};

export const askDuncitKnowledge = {
  async table(query: TableQueryInput | null | undefined) {
    return runTableQuery<IAskDuncitKnowledge>(AskDuncitKnowledgeModel, {}, query, TABLE_CONFIG, {
      projection: { body: 0 },
    });
  },

  async get(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return AskDuncitKnowledgeModel.findById(id).lean<IAskDuncitKnowledge>();
  },

  async create(input: KnowledgeInput, actor: AuditActor) {
    const data = parse(input);
    if (!data.title || !data.body) {
      throw new GraphQLError('A title and a body are required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await AskDuncitKnowledgeModel.create({ ...data, created_by: actor.user_id, updated_by: actor.user_id });
    await recordAudit({ type: 'KNOWLEDGE_CHANGED', actor, detail: { op: 'CREATE', id: String(doc._id), title: doc.title } });
    return doc.toObject();
  },

  async update(id: string, input: KnowledgeInput, actor: AuditActor) {
    const data = parse(input);
    const doc = await AskDuncitKnowledgeModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updated_by: actor.user_id }, $inc: { version: 1 } },
      { new: true }
    ).lean<IAskDuncitKnowledge>();
    if (!doc) throw new GraphQLError('Article not found', { extensions: { code: 'NOT_FOUND' } });
    await recordAudit({ type: 'KNOWLEDGE_CHANGED', actor, detail: { op: 'UPDATE', id, changed: Object.keys(data) } });
    return doc;
  },

  async remove(id: string, actor: AuditActor) {
    const doc = await AskDuncitKnowledgeModel.findByIdAndDelete(id).lean<IAskDuncitKnowledge>();
    if (!doc) throw new GraphQLError('Article not found', { extensions: { code: 'NOT_FOUND' } });
    await recordAudit({ type: 'KNOWLEDGE_CHANGED', actor, detail: { op: 'DELETE', id, title: doc.title } });
    return true;
  },
};
