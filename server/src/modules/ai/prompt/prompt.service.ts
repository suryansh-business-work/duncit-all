import { GraphQLError } from 'graphql';
import { connection } from 'mongoose';
import { AiPromptModel } from './prompt.model';
import { estimateTokens } from '@services/ai/token-estimate';
import { SYSTEM_PROMPTS, SYSTEM_PROMPT_BY_KEY, renderPrompt } from './prompt.catalog';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));

const pub = (doc: any) => {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const content = o.content ?? '';
  return {
    id: String(o._id),
    key: o.key ?? null,
    is_system: !!o.is_system,
    name: o.name,
    description: o.description ?? '',
    content,
    category: o.category ?? 'General',
    target_model: o.target_model ?? '',
    variables: o.variables ?? [],
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

function notASystemPrompt(): never {
  throw new GraphQLError('Only system prompts can be reset', {
    extensions: { code: 'BAD_USER_INPUT' },
  });
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
  async list(
    filter: {
      is_active?: boolean | null;
      category?: string | null;
      search?: string | null;
      is_system?: boolean | null;
    } = {}
  ) {
    const query: any = {};
    if (filter.is_active !== undefined && filter.is_active !== null) query.is_active = filter.is_active;
    if (filter.is_system !== undefined && filter.is_system !== null) query.is_system = filter.is_system;
    if (filter.category) query.category = filter.category;
    if (filter.search) {
      const rx = new RegExp(filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`), 'i');
      query.$or = [{ name: rx }, { description: rx }, { content: rx }, { category: rx }];
    }
    // Feature prompts first — they are the ones operators come here to tune.
    const docs = await AiPromptModel.find(query).sort({ is_system: -1, is_active: -1, name: 1 });
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

  /**
   * Edit a prompt. On a system prompt the identity fields (name, category and
   * the always-on status) belong to the catalog and are ignored — only the body,
   * the note and the target model are operator-owned.
   */
  async update(id: string, input: Partial<AiPromptInput>) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    const system = !!doc.is_system;
    if (input.name != null && !system) doc.name = input.name.trim();
    if (input.description != null) doc.description = input.description;
    if (input.content != null) doc.content = input.content;
    if (input.category != null && !system) doc.category = input.category.trim() || 'General';
    if (input.target_model != null) doc.target_model = input.target_model.trim();
    if (input.is_active != null && !system) doc.is_active = input.is_active;
    await doc.save();
    return pub(doc);
  },

  /** Restore a system prompt's catalog default (the only way back from a bad edit). */
  async reset(id: string) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    const def = doc.key ? SYSTEM_PROMPT_BY_KEY.get(doc.key) : undefined;
    if (!def) notASystemPrompt();
    doc.content = def.content;
    doc.name = def.name;
    doc.description = def.description;
    doc.category = def.category;
    doc.variables = [...def.variables];
    doc.is_active = true;
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    if (doc.is_system) {
      throw new GraphQLError('System prompts power a shipped feature and cannot be deleted', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    await doc.deleteOne();
    return true;
  },

  /**
   * Seed the catalog into the library: a missing prompt is created, an existing
   * one keeps its (possibly edited) body while its catalog-owned metadata is
   * refreshed. Runs on every boot — same contract as the other seedDefaults.
   */
  async seedDefaults() {
    for (const def of SYSTEM_PROMPTS) {
      const existing = await AiPromptModel.findOne({ key: def.key });
      if (existing) {
        existing.is_system = true;
        existing.name = def.name;
        existing.description = def.description;
        existing.category = def.category;
        existing.variables = [...def.variables];
        existing.is_active = true;
        await existing.save();
        continue;
      }
      await AiPromptModel.create({
        key: def.key,
        is_system: true,
        name: def.name,
        description: def.description,
        content: def.content,
        category: def.category,
        variables: [...def.variables],
        is_active: true,
      });
    }
  },
};

/**
 * The live body of a system prompt, with its `{{placeholders}}` filled in.
 * Reads the library row every time so a portal edit takes effect on the next
 * AI call. The catalog default covers the window before the first seed — and a
 * disconnected database, where Mongoose would otherwise buffer the query: an AI
 * feature must never hang waiting for its own prompt.
 */
export async function getSystemPrompt(
  key: string,
  variables: Record<string, string> = {}
): Promise<string> {
  const def = SYSTEM_PROMPT_BY_KEY.get(key);
  /* v8 ignore next -- unreachable: every call site passes a catalog key */
  if (!def) throw new GraphQLError(`Unknown system prompt "${key}"`);
  const doc =
    connection.readyState === 1
      ? await AiPromptModel.findOne({ key, is_active: true }).lean().catch(() => null)
      : null;
  const content = (doc?.content ?? '').trim() || def.content;
  return renderPrompt(content, variables);
}
