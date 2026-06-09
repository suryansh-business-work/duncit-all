import { GraphQLError } from 'graphql';
import { AiPromptModel } from './prompt.model';
import { estimateTokens } from '@services/ai/token-estimate';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const content = o.content ?? '';
  return {
    id: String(o._id),
    name: o.name,
    description: o.description ?? '',
    content,
    category: o.category ?? 'General',
    target_model: o.target_model ?? '',
    token_count: estimateTokens(content),
    is_active: o.is_active !== false,
    created_by: o.created_by ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

function notFound(): never {
  throw new GraphQLError('Prompt not found', { extensions: { code: 'NOT_FOUND' } });
}

export interface AiPromptInput {
  name: string;
  description?: string | null;
  content: string;
  category?: string | null;
  target_model?: string | null;
  is_active?: boolean | null;
}

export const aiPromptService = {
  async list(filter: { is_active?: boolean | null; category?: string | null; search?: string | null } = {}) {
    const query: any = {};
    if (filter.is_active !== undefined && filter.is_active !== null) query.is_active = filter.is_active;
    if (filter.category) query.category = filter.category;
    if (filter.search) {
      const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      query.$or = [{ name: rx }, { description: rx }, { content: rx }, { category: rx }];
    }
    const docs = await AiPromptModel.find(query).sort({ is_active: -1, name: 1 });
    return docs.map(pub);
  },

  async get(id: string) {
    const doc = await AiPromptModel.findById(id);
    return doc ? pub(doc) : null;
  },

  async create(input: AiPromptInput, by?: string | null) {
    if (!input.name?.trim()) {
      throw new GraphQLError('Name is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    if (!input.content?.trim()) {
      throw new GraphQLError('Prompt content is required', { extensions: { code: 'BAD_USER_INPUT' } });
    }
    const doc = await AiPromptModel.create({
      name: input.name.trim(),
      description: input.description ?? '',
      content: input.content,
      category: input.category?.trim() || 'General',
      target_model: input.target_model?.trim() ?? '',
      is_active: input.is_active !== false,
      created_by: by ?? null,
    });
    return pub(doc);
  },

  async update(id: string, input: Partial<AiPromptInput>) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    if (input.name != null) doc.name = input.name.trim();
    if (input.description != null) doc.description = input.description;
    if (input.content != null) doc.content = input.content;
    if (input.category != null) doc.category = input.category.trim() || 'General';
    if (input.target_model != null) doc.target_model = input.target_model.trim();
    if (input.is_active != null) doc.is_active = input.is_active;
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await AiPromptModel.findByIdAndDelete(id);
    if (!doc) notFound();
    return true;
  },
};
