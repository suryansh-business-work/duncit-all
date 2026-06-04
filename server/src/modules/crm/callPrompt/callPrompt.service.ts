import { GraphQLError } from 'graphql';
import { CallPromptModel } from './callPrompt.model';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : v ?? null);

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    name: o.name,
    description: o.description ?? '',
    context: o.context ?? '',
    language: o.language ?? 'auto',
    is_active: o.is_active !== false,
    created_by: o.created_by ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

function notFound(): never {
  throw new GraphQLError('Call prompt not found', { extensions: { code: 'NOT_FOUND' } });
}

export interface CallPromptInput {
  name: string;
  description?: string | null;
  context: string;
  language?: string | null;
  is_active?: boolean | null;
}

export const callPromptService = {
  async list(filter: { is_active?: boolean | null; search?: string | null } = {}) {
    const query: any = {};
    if (filter.is_active !== undefined && filter.is_active !== null) query.is_active = filter.is_active;
    if (filter.search) {
      const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ name: rx }, { description: rx }, { context: rx }];
    }
    const docs = await CallPromptModel.find(query).sort({ is_active: -1, name: 1 });
    return docs.map(pub);
  },

  async get(id: string) {
    const doc = await CallPromptModel.findById(id);
    return doc ? pub(doc) : null;
  },

  /** Raw context for an active prompt — used by the AI-call webhook. */
  async resolveContext(id: string): Promise<{ id: string; name: string; context: string; language: string } | null> {
    const doc = await CallPromptModel.findById(id);
    if (!doc || doc.is_active === false) return null;
    return { id: String(doc._id), name: doc.name, context: doc.context ?? '', language: doc.language ?? 'auto' };
  },

  async create(input: CallPromptInput, by?: string | null) {
    if (!input.name?.trim()) {
      throw new GraphQLError('Name is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (!input.context?.trim()) {
      throw new GraphQLError('Static content is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await CallPromptModel.create({
      name: input.name.trim(),
      description: input.description ?? '',
      context: input.context,
      language: input.language?.trim() || 'auto',
      is_active: input.is_active !== false,
      created_by: by ?? null,
    });
    return pub(doc);
  },

  async update(id: string, input: Partial<CallPromptInput>) {
    const doc = await CallPromptModel.findById(id);
    if (!doc) notFound();
    if (input.name != null) doc.name = input.name.trim();
    if (input.description != null) doc.description = input.description;
    if (input.context != null) doc.context = input.context;
    if (input.language != null) doc.language = input.language.trim() || 'auto';
    if (input.is_active != null) doc.is_active = input.is_active;
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await CallPromptModel.findByIdAndDelete(id);
    if (!doc) notFound();
    return true;
  },
};
