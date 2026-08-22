import { GraphQLError } from 'graphql';
import { connection } from 'mongoose';
import { AiPromptModel } from './prompt.model';
import { estimateTokens } from '@services/ai/token-estimate';
import { CODE_PROMPTS, CODE_PROMPT_BY_KEY } from './catalog';
import { extractVariables, renderPrompt } from './prompt.render';
import type { PromptKind, PromptVariableDef } from './prompt.types';
import { logs } from '@observability/log';

const iso = (v: any) => (v instanceof Date ? v.toISOString() : (v ?? null));

/**
 * `kind` is written on every row this file creates. It can still be absent on a
 * row stored before the field existed, and back then only a catalogue prompt
 * carried a key — so for those, and only those, the key is the tell.
 */
const kindOf = (o: any): PromptKind => {
  if (o.kind === 'CODE' || o.kind === 'AI') return o.kind;
  return o.key ? 'CODE' : 'AI';
};

/** The GraphQL/feed view of a row. Callers guard for a missing document. */
const pub = (doc: any) => {
  const o = doc.toObject ? doc.toObject() : doc;
  const content = o.content ?? '';
  return {
    id: String(o._id),
    key: o.key ?? null,
    kind: kindOf(o),
    role: o.role === 'USER' ? 'USER' : 'SYSTEM',
    name: o.name,
    description: o.description ?? '',
    content,
    category: o.category ?? 'General',
    target_model: o.target_model ?? '',
    variables: (o.variables ?? []).map((v: any) => ({
      name: v.name,
      label: v.label || v.name,
      description: v.description ?? '',
      required: !!v.required,
      example: v.example ?? '',
    })),
    tasks: o.tasks ?? [],
    usage: (o.usage ?? []).map((u: any) => ({
      file: u.file ?? '',
      surface: u.surface ?? '',
      trigger: u.trigger ?? '',
    })),
    token_count: estimateTokens(content),
    is_active: o.is_active !== false,
    created_by: o.created_by ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

export type PublicAiPrompt = ReturnType<typeof pub>;

function notFound(): never {
  throw new GraphQLError('Prompt not found', { extensions: { code: 'NOT_FOUND' } });
}

function badInput(message: string): never {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
}

/**
 * A CODE prompt whose body lost a required `{{placeholder}}` is a broken
 * feature that reports no error: the call site still fills a variable nothing
 * reads, and the model is asked a question with the facts missing. Refusing the
 * save is the only moment this is catchable.
 */
function assertKeepsRequiredVariables(content: string, variables: PromptVariableDef[]): void {
  const present = new Set(extractVariables(content));
  const missing = variables.filter((v) => v.required && !present.has(v.name));
  if (missing.length === 0) return;
  const named = missing.map((v) => braced(v.name)).join(', ');
  badInput(
    `This prompt needs ${named} in the body — the feature fills them in, and without them it runs with the facts missing.`
  );
}

/** Placeholders read best the way they are written in the body. */
const braced = (name: string) => `{{${name}}}`;

/** The placeholder list an AI prompt gets: whatever its body actually names. */
const derivedVariables = (content: string) =>
  extractVariables(content).map((name) => ({
    name,
    label: name,
    description: '',
    required: false,
    example: '',
  }));

/** The characters a key may not start or end with. */
const KEY_EDGE = new Set(['-', '.']);

/**
 * Strip leading and trailing `-`/`.` in one linear pass.
 *
 * An anchored `[-.]+$` looks equivalent but is not: on a long run that
 * never reaches the end of the string the engine retries from every start
 * position, which costs quadratic time. Scanning the two ends is O(n) and says
 * what it means.
 */
function trimKeyEdges(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && KEY_EDGE.has(value.charAt(start))) start += 1;
  while (end > start && KEY_EDGE.has(value.charAt(end - 1))) end -= 1;
  return value.slice(start, end);
}

/**
 * The public feed addresses a prompt by key, so an AI prompt needs one too —
 * given at creation or slugged from its name. Keys are lowercase, dot- and
 * dash-separated, which is the shape the catalogue already uses.
 */
function slugKey(raw: string): string {
  return trimKeyEdges(
    raw
      .trim()
      .toLowerCase()
      // One pass is enough: the run quantifier already collapses "a -- b" to "a-b".
      .replaceAll(/[^a-z0-9.]+/g, '-'),
  );
}

export interface AiPromptInput {
  /** Only honoured on create — a key that moves breaks whoever fetches it. */
  key?: string | null;
  name: string;
  description?: string | null;
  content: string;
  category?: string | null;
  target_model?: string | null;
  is_active?: boolean | null;
}

const keyTaken = (key: string) =>
  `"${key}" is already taken — the public feed addresses prompts by key, so two rows cannot share one.`;

/** Create the row, turning the unique-index collision into the same readable error. */
async function createOrReportCollision(key: string, doc: Record<string, unknown>) {
  try {
    return await AiPromptModel.create(doc);
  } catch (err) {
    if ((err as { code?: number })?.code === 11000) badInput(keyTaken(key));
    throw err;
  }
}

export interface AiPromptFilterInput {
  is_active?: boolean | null;
  category?: string | null;
  search?: string | null;
  kind?: PromptKind | null;
}

/**
 * The body edit, which is the only field both kinds share. A code prompt keeps
 * its catalogue-declared placeholders and must not lose a required one; an AI
 * prompt has no catalogue, so its list is re-read from the body it just got.
 */
function applyContent(doc: any, content: string, code: boolean): void {
  if (!content.trim()) badInput('Prompt content is required');
  if (code) {
    assertKeepsRequiredVariables(content, doc.variables as PromptVariableDef[]);
  } else {
    doc.set('variables', derivedVariables(content));
  }
  doc.content = content;
}

export const aiPromptService = {
  async list(filter: AiPromptFilterInput = {}) {
    const query: any = {};
    if (filter.is_active !== undefined && filter.is_active !== null) {
      query.is_active = filter.is_active;
    }
    if (filter.kind) query.kind = filter.kind;
    if (filter.category) query.category = filter.category;
    if (filter.search) {
      const rx = new RegExp(
        filter.search.trim().replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`),
        'i'
      );
      query.$or = [{ name: rx }, { description: rx }, { content: rx }, { category: rx }, { key: rx }];
    }
    // Code prompts first — they are the ones operators come here to tune — and
    // a SYSTEM turn above the USER turn it is paired with.
    const docs = await AiPromptModel.find(query).sort({
      kind: 1,
      category: 1,
      name: 1,
    });
    return docs.map(pub);
  },

  async get(id: string) {
    const doc = await AiPromptModel.findById(id);
    return doc ? pub(doc) : null;
  },

  /** One prompt by its catalogue key. Powers the public feed's single-row route. */
  async getByKey(key: string) {
    const doc = await AiPromptModel.findOne({ key });
    return doc ? pub(doc) : null;
  },

  /**
   * Create an AI prompt. There is deliberately no way to create a CODE one:
   * a CODE row exists because a call site reads it, and a portal cannot add a
   * call site — the row would sit in the library looking live and do nothing.
   */
  async create(input: AiPromptInput, by?: string | null) {
    if (!input.name?.trim()) badInput('Name is required');
    if (!input.content?.trim()) badInput('Prompt content is required');
    const content = input.content;
    const key = slugKey(input.key?.trim() || input.name);
    if (!key) badInput('Give the prompt a name with at least one letter or number in it');
    // Checked here for the readable error, and again from the unique index in
    // the catch below — two operators naming a prompt the same thing at once is
    // rare, but a duplicate key would make the feed serve whichever row won.
    if (await AiPromptModel.exists({ key })) badInput(keyTaken(key));
    const doc = await createOrReportCollision(key, {
      key,
      kind: 'AI',
      role: 'SYSTEM',
      name: input.name.trim(),
      description: input.description ?? '',
      content,
      category: input.category?.trim() || 'General',
      target_model: input.target_model?.trim() ?? '',
      // An AI prompt has no catalogue to declare its placeholders, so they are
      // read back out of the body — which is also what the GET feed publishes.
      variables: derivedVariables(content),
      is_active: input.is_active !== false,
      created_by: by ?? null,
    });
    return pub(doc);
  },

  /**
   * Edit a prompt. On a CODE prompt the identity fields (name, category and the
   * always-on status) belong to the catalogue and are ignored — the next boot
   * would overwrite them anyway. Only the body, the note and the target model
   * are operator-owned, and the body must keep its required placeholders.
   */
  async update(id: string, input: Partial<AiPromptInput>) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    const code = kindOf(doc.toObject()) === 'CODE';
    if (input.content != null) applyContent(doc, input.content, code);
    if (input.description != null) doc.description = input.description;
    if (input.target_model != null) doc.target_model = input.target_model.trim();
    if (!code) {
      if (input.name != null) doc.name = input.name.trim();
      if (input.category != null) doc.category = input.category.trim() || 'General';
      if (input.is_active != null) doc.is_active = input.is_active;
    }
    await doc.save();
    return pub(doc);
  },

  /** Restore a CODE prompt's catalogue default (the only way back from a bad edit). */
  async reset(id: string) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    const def = doc.key ? CODE_PROMPT_BY_KEY.get(doc.key) : undefined;
    if (!def) badInput('Only code prompts can be reset');
    doc.content = def.content;
    doc.name = def.name;
    doc.description = def.description;
    doc.category = def.category;
    doc.role = def.role;
    doc.target_model = def.target_model;
    doc.set('variables', def.variables);
    doc.set('tasks', def.tasks);
    doc.set('usage', def.usage);
    doc.is_active = true;
    await doc.save();
    return pub(doc);
  },

  async remove(id: string) {
    const doc = await AiPromptModel.findById(id);
    if (!doc) notFound();
    if (kindOf(doc.toObject()) === 'CODE') {
      throw new GraphQLError('Code prompts power a shipped feature and cannot be deleted', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    await doc.deleteOne();
    return true;
  },

  /**
   * Seed the catalogue into the library: a missing prompt is created, an
   * existing one keeps its (possibly edited) body and target model while its
   * catalogue-owned metadata is refreshed. Runs on every boot — same contract as
   * the other seedDefaults.
   */
  async seedDefaults() {
    // Rows written before `kind` existed carry the old `is_system` flag. Two
    // fields answering "is this a code prompt" is how they drift, so the flag
    // goes as the new field lands.
    await AiPromptModel.collection.updateMany({ kind: { $exists: false } }, [
      { $set: { kind: { $cond: [{ $ifNull: ['$key', false] }, 'CODE', 'AI'] } } },
    ]);
    await AiPromptModel.collection.updateMany(
      { is_system: { $exists: true } },
      { $unset: { is_system: '' } }
    );

    for (const def of CODE_PROMPTS) {
      const existing = await AiPromptModel.findOne({ key: def.key });
      if (existing) {
        existing.kind = 'CODE';
        existing.role = def.role;
        existing.name = def.name;
        existing.description = def.description;
        existing.category = def.category;
        existing.set('variables', def.variables);
        existing.set('tasks', def.tasks);
        existing.set('usage', def.usage);
        existing.is_active = true;
        await existing.save();
        continue;
      }
      await AiPromptModel.create({
        key: def.key,
        kind: 'CODE',
        role: def.role,
        name: def.name,
        description: def.description,
        content: def.content,
        category: def.category,
        target_model: def.target_model,
        variables: def.variables,
        tasks: def.tasks,
        usage: def.usage,
        is_active: true,
      });
    }

    // A CODE row whose key left the catalogue is the exact failure this library
    // exists to prevent: it still reads as live, an operator edits it, and
    // nothing changes because no call site names that key any more.
    const retired = await AiPromptModel.deleteMany({
      kind: 'CODE',
      key: { $nin: CODE_PROMPTS.map((p) => p.key) },
    });
    if (retired.deletedCount > 0) {
      logs.server.info('aiPrompt', 'seedDefaults', {
        msg: 'removed code prompts no longer named by any call site',
        removed: retired.deletedCount,
      });
    }
  },
};

/** A prompt as the call site needs it: the body, filled in, and the model to send it to. */
export interface ResolvedPrompt {
  content: string;
  /** '' means "use the configured default" — `openaiChat` treats it that way. */
  model: string;
}

/**
 * The live body of a CODE prompt, with its `{{placeholders}}` filled in, plus
 * the model the operator picked for it.
 *
 * Reads the library row every time, so a portal edit takes effect on the next
 * AI call — that is the entire contract of the library and the reason the row
 * is not cached. The catalogue default covers the window before the first seed,
 * and a disconnected database, where Mongoose would otherwise buffer the query:
 * an AI feature must never hang waiting for its own prompt.
 */
export async function resolvePrompt(
  key: string,
  variables: Record<string, string> = {}
): Promise<ResolvedPrompt> {
  const def = CODE_PROMPT_BY_KEY.get(key);
  /* v8 ignore next -- unreachable: every call site passes a catalogue key */
  if (!def) throw new GraphQLError(`Unknown code prompt "${key}"`);
  const doc =
    connection.readyState === 1
      ? await AiPromptModel.findOne({ key, is_active: true })
          .lean()
          .catch(() => null)
      : null;
  const content = (doc?.content ?? '').trim() || def.content;
  return {
    content: renderPrompt(content, variables),
    model: (doc?.target_model ?? '').trim() || def.target_model,
  };
}

/** The rendered body alone, for a call site that does not pin a model. */
export async function getSystemPrompt(
  key: string,
  variables: Record<string, string> = {}
): Promise<string> {
  const { content } = await resolvePrompt(key, variables);
  return content;
}
