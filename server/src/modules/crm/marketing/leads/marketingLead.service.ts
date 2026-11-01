import { GraphQLError } from 'graphql';
import { isValidObjectId } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { allUsersExist, ownerNamesOf } from '../userNames';
import { userActor } from '../runs/marketingRun.service';
import { MarketingLeadModel, type MarketingLeadDoc } from './marketingLead.model';
import { dedupeKeys, emailKey, keyMatch, phoneDigits, type DedupeKeys } from './marketingLead.keys';
import {
  LEAD_LIMITS,
  LEAD_PIPELINES,
  LEAD_SOURCES,
  LEAD_STAGES,
  type LeadActor,
  type LeadInput,
  type MarketingLeadPipeline,
  type MarketingLeadSource,
  type MarketingLeadStage,
  type MarketingLeadTimelineKind,
} from './marketingLead.types';

/**
 * The lead pipeline's one write path. Every source — a search, an import, a
 * person — goes through {@link upsertLead}, which is where a lead already
 * known by phone, email, website or handle is merged into rather than
 * duplicated. The page's reads and the actions a person takes on a lead
 * (stage, owner, note) live here too; the import and the promotion to the
 * CRM have files of their own.
 */
const TIMELINE_TEXT_MAX = 140;

export function refuse(message: string, code = 'BAD_USER_INPUT'): never {
  throw new GraphQLError(message, { extensions: { code } });
}

const iso = (value: unknown) => (value instanceof Date ? value.toISOString() : null);
const clip = (value: string, max: number) => value.slice(0, max);
const unique = (values: readonly string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))];

export const timelineEntry = (kind: MarketingLeadTimelineKind, text: string, actor: LeadActor) => ({
  at: new Date(),
  kind,
  text: clip(text, TIMELINE_TEXT_MAX),
  by_name: actor.name,
});

/** The signed-in person as the timeline names them. */
export async function leadActor(user: { id: string; email?: string | null }): Promise<LeadActor> {
  const actor = await userActor(user);
  return { id: user.id, name: actor.name || actor.email || user.id };
}

const LEAD_TABLE: TableEntityConfig = {
  searchFields: ['name', 'company', 'emails', 'phones', 'website', 'instagram_handle', 'city'],
  sortFields: { created_at: 'created_at', updated_at: 'updated_at', score: 'score', name: 'name', stage: 'stage' },
  filterFields: {
    pipeline: { type: 'enum' },
    stage: { type: 'enum' },
    source: { type: 'enum' },
    owner_user_id: { type: 'string' },
    city: { type: 'string' },
    score: { type: 'number' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    has_crm_ref: { path: 'promoted', type: 'boolean' },
  },
  defaultSort: { created_at: -1 },
};

export const pubLead = (o: MarketingLeadDoc, owners: Map<string, string>) => {
  const ownerId = o.owner_user_id ?? null;
  return {
    id: String(o._id),
    name: o.name,
    company: o.company ?? '',
    pipeline: o.pipeline,
    stage: o.stage,
    source: o.source,
    emails: o.emails ?? [],
    phones: o.phones ?? [],
    website: o.website ?? '',
    instagram_handle: o.instagram_handle ?? '',
    instagram_url: o.instagram_handle ? `https://www.instagram.com/${o.instagram_handle}/` : '',
    city: o.city ?? '',
    score: o.score ?? null,
    score_reason: o.score_reason ?? '',
    owner_user_id: ownerId,
    owner_name: ownerId ? (owners.get(ownerId) ?? null) : null,
    tags: o.tags ?? [],
    notes: (o.notes ?? []).map((n) => ({ at: iso(n.at), by_user_id: n.by_user_id ?? null, by_name: n.by_name ?? '', text: n.text })),
    timeline: (o.timeline ?? []).map((e) => ({ at: iso(e.at), kind: e.kind, text: e.text ?? '', by_name: e.by_name ?? '' })),
    crm_ref: o.crm_ref?.kind
      ? { kind: o.crm_ref.kind, id: o.crm_ref.id ?? '', promoted_at: iso(o.crm_ref.promoted_at), promoted_by: o.crm_ref.promoted_by ?? '' }
      : null,
    source_ref: {
      ig_lead_id: o.source_ref?.ig_lead_id ?? '',
      search_id: o.source_ref?.search_id ?? '',
      import_id: o.source_ref?.import_id ?? '',
    },
    created_by: o.created_by ?? null,
    created_at: iso(o.created_at),
    updated_at: iso(o.updated_at),
  };
};

export type PublicLead = ReturnType<typeof pubLead>;

export async function loadLead(id: string): Promise<MarketingLeadDoc> {
  const doc = isValidObjectId(id) ? await MarketingLeadModel.findById(id).lean<MarketingLeadDoc>() : null;
  if (!doc) refuse('Lead not found', 'NOT_FOUND');
  return doc;
}

async function publish(id: string): Promise<PublicLead> {
  const doc = await loadLead(id);
  return pubLead(doc, await ownerNamesOf([doc]));
}

const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T => values.some((v) => v === value);

/** A 0-100 whole number, or null when the source gave none. */
function cleanScore(score: number | null | undefined): number | null {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  return Math.min(100, Math.max(0, Math.round(score)));
}

/** The phones a lead was handed, as digits, or a refusal naming the one that is not a number. */
function cleanPhones(phones: readonly string[]): string[] {
  return unique(
    phones.map((raw) => {
      const digits = phoneDigits(raw);
      if (!digits) refuse(`"${raw}" is not a phone number`);
      return digits;
    })
  ).slice(0, LEAD_LIMITS.contacts.each);
}

function cleanEmails(emails: readonly string[]): string[] {
  return unique(
    emails.map((raw) => {
      const email = emailKey(raw);
      if (!email) refuse(`"${raw}" is not an email address`);
      return email;
    })
  ).slice(0, LEAD_LIMITS.contacts.each);
}

/** What a stored lead carries, apart from its keys and history. */
export interface CleanLead {
  name: string;
  company: string;
  pipeline: MarketingLeadPipeline;
  stage: MarketingLeadStage;
  source: MarketingLeadSource;
  emails: string[];
  phones: string[];
  website: string;
  instagram_handle: string;
  city: string;
  score: number | null;
  score_reason: string;
  tags: string[];
  source_ref: { ig_lead_id: string; search_id: string; import_id: string };
}

/** Trim, bound and type-check what a source handed over; refuses rather than stores nonsense. */
export function cleanInput(input: LeadInput): CleanLead {
  const name = (input.name ?? '').trim();
  if (name.length < LEAD_LIMITS.name.min || name.length > LEAD_LIMITS.name.max) {
    refuse(`Give the lead a name of ${LEAD_LIMITS.name.min}-${LEAD_LIMITS.name.max} characters.`);
  }
  if (input.pipeline && !isOneOf(LEAD_PIPELINES, input.pipeline)) refuse('That pipeline does not exist.');
  if (input.stage && !isOneOf(LEAD_STAGES, input.stage)) refuse('That stage does not exist.');
  if (input.source && !isOneOf(LEAD_SOURCES, input.source)) refuse('That source does not exist.');
  const keys = dedupeKeys({ website: input.website, instagram_handle: input.instagram_handle });
  if ((input.website ?? '').trim() && !keys.website_host) refuse('The website is not a web address.');
  if ((input.instagram_handle ?? '').trim() && !keys.instagram_handle) refuse('The Instagram handle is not one.');
  return {
    name,
    company: clip((input.company ?? '').trim(), LEAD_LIMITS.company.max),
    pipeline: input.pipeline ?? 'GENERAL',
    stage: input.stage ?? 'NEW',
    source: input.source ?? 'MANUAL',
    emails: cleanEmails(input.emails ?? []),
    phones: cleanPhones(input.phones ?? []),
    website: clip((input.website ?? '').trim(), LEAD_LIMITS.website.max),
    instagram_handle: keys.instagram_handle,
    city: clip((input.city ?? '').trim(), LEAD_LIMITS.city.max),
    score: cleanScore(input.score),
    score_reason: clip((input.score_reason ?? '').trim(), LEAD_LIMITS.score_reason.max),
    tags: unique(input.tags ?? [])
      .map((tag) => clip(tag, LEAD_LIMITS.tags.each))
      .slice(0, LEAD_LIMITS.tags.max),
    source_ref: {
      ig_lead_id: input.source_ref?.ig_lead_id ?? '',
      search_id: input.source_ref?.search_id ?? '',
      import_id: input.source_ref?.import_id ?? '',
    },
  };
}

type Stored = Pick<MarketingLeadDoc, 'pipeline' | 'score' | 'source_ref'> & Record<string, unknown>;

/** The text fields a second sighting may fill — only where the row still has nothing. */
const FILLABLE = ['name', 'company', 'website', 'instagram_handle', 'city', 'score_reason'] as const;

/** What a merge sets: empty fields filled, lists unioned, keys unioned; stage, owner and notes untouched. */
export function mergeFields(existing: Stored, incoming: CleanLead, keys: DedupeKeys): Record<string, unknown> {
  const set: Record<string, unknown> = {};
  for (const field of FILLABLE) {
    if (!existing[field] && incoming[field]) set[field] = incoming[field];
  }
  if (existing.score === null && incoming.score !== null) set.score = incoming.score;
  if (existing.pipeline === 'GENERAL' && incoming.pipeline !== 'GENERAL') set.pipeline = incoming.pipeline;
  for (const list of ['emails', 'phones', 'tags', 'phone_keys', 'email_keys'] as const) {
    const have = (existing[list] as string[] | undefined) ?? [];
    const add = list === 'phone_keys' || list === 'email_keys' ? keys[list] : incoming[list];
    const merged = unique([...have, ...add]);
    if (merged.length !== have.length) set[list] = merged;
  }
  if (!existing.website_host && keys.website_host) set.website_host = keys.website_host;
  for (const ref of ['ig_lead_id', 'search_id', 'import_id'] as const) {
    if (!existing.source_ref?.[ref] && incoming.source_ref[ref]) set[`source_ref.${ref}`] = incoming.source_ref[ref];
  }
  return set;
}

export interface UpsertResult {
  lead: PublicLead;
  merged: boolean;
}

/**
 * The one way a lead enters the pipeline. A lead sharing any key with one
 * already here fills that row's gaps and notes the sighting on its timeline;
 * otherwise a new row is made. Nothing a person set — stage, owner, notes —
 * is ever overwritten by a source.
 */
export async function upsertLead(input: LeadInput, actor: LeadActor): Promise<UpsertResult> {
  const clean = cleanInput(input);
  const keys = dedupeKeys(clean);
  const match = keyMatch(keys);
  const existing = match ? await MarketingLeadModel.findOne(match).sort({ created_at: 1 }).lean<MarketingLeadDoc>() : null;
  if (!existing) {
    const doc = await MarketingLeadModel.create({
      ...clean,
      ...keys,
      created_by: actor.id,
      timeline: [timelineEntry(clean.source === 'IMPORT' ? 'IMPORTED' : 'CREATED', `Added from ${clean.source}`, actor)],
    });
    return { lead: await publish(String(doc._id)), merged: false };
  }
  const id = String(existing._id);
  await MarketingLeadModel.updateOne(
    { _id: id },
    { $set: mergeFields(existing, clean, keys), $push: { timeline: timelineEntry('SOURCE', `Seen again from ${clean.source}`, actor) } }
  );
  return { lead: await publish(id), merged: true };
}

/** Whether another lead already holds any of these keys. */
async function heldByAnother(keys: DedupeKeys, id: string): Promise<boolean> {
  const match = keyMatch(keys);
  if (!match) return false;
  return (await MarketingLeadModel.exists({ ...match, _id: { $ne: id } })) !== null;
}

export const marketingLeadService = {
  async table(input?: TableQueryInput | null) {
    const { docs, total, page, page_size } = await runTableQuery<MarketingLeadDoc>(MarketingLeadModel, {}, input, LEAD_TABLE, {
      projection: { notes: 0, timeline: 0 },
    });
    const owners = await ownerNamesOf(docs);
    return { rows: docs.map((doc) => pubLead(doc, owners)), total, page, page_size };
  },

  get: publish,

  /** A lead typed in by hand. One that matches a known lead merges into it, and says so. */
  async create(input: LeadInput, user: { id: string; email?: string | null }): Promise<UpsertResult> {
    return upsertLead({ ...input, source: input.source ?? 'MANUAL' }, await leadActor(user));
  },

  /** Edit a lead's own fields. Keys that would collide with another lead are refused rather than merged. */
  async update(id: string, input: LeadInput): Promise<PublicLead> {
    const existing = await loadLead(id);
    const clean = cleanInput({ ...input, source: existing.source, stage: existing.stage });
    const keys = dedupeKeys(clean);
    if (await heldByAnother(keys, id)) refuse('Another lead already has that phone, email, website or handle.', 'CONFLICT');
    const fields = {
      name: clean.name,
      company: clean.company,
      pipeline: clean.pipeline,
      emails: clean.emails,
      phones: clean.phones,
      website: clean.website,
      instagram_handle: clean.instagram_handle,
      city: clean.city,
      score: clean.score,
      score_reason: clean.score_reason,
      tags: clean.tags,
    };
    await MarketingLeadModel.updateOne({ _id: id }, { $set: { ...fields, ...keys } });
    return publish(id);
  },

  /** Move the lead along. Losing one needs a reason; the reason is kept as a note. */
  async setStage(id: string, stage: MarketingLeadStage, user: { id: string; email?: string | null }, note?: string | null) {
    if (!isOneOf(LEAD_STAGES, stage)) refuse('That stage does not exist.');
    const text = (note ?? '').trim();
    if (stage === 'LOST' && !text) refuse('Say why — a note is required when a lead is lost.');
    if (text.length > LEAD_LIMITS.note.max) refuse(`Keep the note under ${LEAD_LIMITS.note.max} characters.`);
    const doc = await loadLead(id);
    if (doc.stage === stage) refuse(`The lead is already ${stage}.`);
    const actor = await leadActor(user);
    const entry = timelineEntry('STAGE', text ? `${doc.stage} → ${stage}: ${text}` : `${doc.stage} → ${stage}`, actor);
    const push = text
      ? { timeline: entry, notes: { at: entry.at, by_user_id: actor.id, by_name: actor.name, text } }
      : { timeline: entry };
    await MarketingLeadModel.updateOne({ _id: id }, { $set: { stage }, $push: push });
    return publish(id);
  },

  /** Who works the lead. The owner must be a living user; null hands it back to nobody. */
  async assignOwner(id: string, ownerUserId: string | null | undefined, user: { id: string; email?: string | null }) {
    const owner = ownerUserId?.trim() || null;
    if (owner && !(await allUsersExist([owner]))) refuse('The owner is not a known user.');
    await loadLead(id);
    const actor = await leadActor(user);
    const ownerName = owner ? ((await ownerNamesOf([{ owner_user_id: owner }])).get(owner) ?? owner) : '';
    const entry = timelineEntry('OWNER', owner ? `Assigned to ${ownerName}` : 'Owner cleared', actor);
    await MarketingLeadModel.updateOne({ _id: id }, { $set: { owner_user_id: owner }, $push: { timeline: entry } });
    return publish(id);
  },

  async addNote(id: string, text: string, user: { id: string; email?: string | null }) {
    const body = (text ?? '').trim();
    if (body.length < LEAD_LIMITS.note.min) refuse('Write the note first.');
    if (body.length > LEAD_LIMITS.note.max) refuse(`Keep the note under ${LEAD_LIMITS.note.max} characters.`);
    await loadLead(id);
    const actor = await leadActor(user);
    const entry = timelineEntry('NOTE', body, actor);
    await MarketingLeadModel.updateOne(
      { _id: id },
      { $push: { notes: { at: entry.at, by_user_id: actor.id, by_name: actor.name, text: body }, timeline: entry } }
    );
    return publish(id);
  },

  /** How many leads sit at each stage and in each pipeline — the page's header. */
  async summary() {
    const [byStage, byPipeline] = await Promise.all([
      MarketingLeadModel.aggregate<{ _id: MarketingLeadStage; count: number }>([{ $group: { _id: '$stage', count: { $sum: 1 } } }]),
      MarketingLeadModel.aggregate<{ _id: MarketingLeadPipeline; count: number }>([{ $group: { _id: '$pipeline', count: { $sum: 1 } } }]),
    ]);
    const stageCount = new Map(byStage.map((row) => [row._id, row.count]));
    const pipelineCount = new Map(byPipeline.map((row) => [row._id, row.count]));
    return {
      total: byStage.reduce((sum, row) => sum + row.count, 0),
      stages: LEAD_STAGES.map((stage) => ({ stage, count: stageCount.get(stage) ?? 0 })),
      pipelines: LEAD_PIPELINES.map((pipeline) => ({ pipeline, count: pipelineCount.get(pipeline) ?? 0 })),
    };
  },
};
