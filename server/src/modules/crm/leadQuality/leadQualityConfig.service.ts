import { GraphQLError } from 'graphql';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { DEFAULT_QUALITY_CONFIGS } from './leadQuality.defaults';
import {
  LeadQualityConfigModel,
  LeadQualityEventModel,
  type QualityConfigDoc,
  type QualityConfigStatus,
} from './leadQuality.model';
import {
  QUALITY_LEAD_TYPES,
  validateQualityConfig,
  withKeys,
  type AutoCheck,
  type BandTone,
  type QualityConfigBody,
  type QualityIssue,
  type QualityLeadType,
  type QualityValidationMode,
} from './leadQuality.rules';

/**
 * Versions of each lead type's scoring model: read the published one, edit a
 * draft, publish it, look back through history. Every write is validated with
 * the shared rules — the console, the API and MCP get the same refusals.
 */

export interface QualityActor {
  id: string | null;
  name: string;
}

export const SYSTEM_ACTOR: QualityActor = { id: null, name: 'System' };

/** A configuration as stored and as the API returns it. */
export interface QualityConfig extends QualityConfigBody {
  id: string;
  lead_type: QualityLeadType;
  version: number;
  status: QualityConfigStatus;
  change_note: string;
  revision: number;
  created_by: QualityActor;
  updated_by: QualityActor;
  published_by: QualityActor | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** What a client sends: names and numbers; keys are optional (filled from names), booleans default. */
export interface QualityConfigInput {
  criteria?: ReadonlyArray<Record<string, unknown>> | null;
  min_qualification_score?: number | null;
  bands?: ReadonlyArray<Record<string, unknown>> | null;
}

const MAX_NOTE = 300;

const iso = (value: unknown): string | null => (value instanceof Date ? value.toISOString() : null);
const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const asNumber = (value: unknown): number => (typeof value === 'number' ? value : Number.NaN);
const asThreshold = (value: unknown): number | null => (value === null || value === undefined ? null : asNumber(value));
const actorOf = (raw: unknown): QualityActor => {
  const actor = (raw ?? {}) as { id?: string | null; name?: string };
  return { id: actor.id ?? null, name: actor.name ?? '' };
};

export function isQualityLeadType(value: unknown): value is QualityLeadType {
  return QUALITY_LEAD_TYPES.includes(value as QualityLeadType);
}

export function assertLeadType(value: unknown): QualityLeadType {
  if (!isQualityLeadType(value)) {
    throw new GraphQLError(`Unknown lead type. Use one of ${QUALITY_LEAD_TYPES.join(', ')}.`, { extensions: { code: 'BAD_USER_INPUT' } });
  }
  return value;
}

/** A body exactly as typed: nothing is clamped or rounded, so validation sees what was sent. */
export function toBody(input: QualityConfigInput): QualityConfigBody {
  return withKeys({
    criteria: (input.criteria ?? []).map((raw) => ({
      key: text(raw.key),
      name: text(raw.name),
      weightage: asNumber(raw.weightage),
      enabled: raw.enabled !== false,
      mandatory: raw.mandatory === true,
      auto_check: (text(raw.auto_check) || 'NONE') as AutoCheck,
      threshold: asThreshold(raw.threshold),
      guidance: text(raw.guidance),
      sub_criteria: (Array.isArray(raw.sub_criteria) ? (raw.sub_criteria as Record<string, unknown>[]) : []).map((sub) => ({
        key: text(sub.key),
        name: text(sub.name),
        points: asNumber(sub.points),
        mandatory: sub.mandatory === true,
        auto_check: (text(sub.auto_check) || 'NONE') as AutoCheck,
        threshold: asThreshold(sub.threshold),
        guidance: text(sub.guidance),
      })),
    })),
    min_qualification_score:
      input.min_qualification_score === null || input.min_qualification_score === undefined ? null : asNumber(input.min_qualification_score),
    bands: (input.bands ?? []).map((raw) => ({
      key: text(raw.key),
      label: text(raw.label),
      min: asNumber(raw.min),
      tone: text(raw.tone) as BandTone,
    })),
  });
}

/** Refuse with every problem listed: `issues` for the console, `errors` (plain lines) for MCP. */
export function assertValid(body: QualityConfigBody, mode: QualityValidationMode): void {
  const issues: QualityIssue[] = validateQualityConfig(body, mode);
  if (issues.length === 0) return;
  throw new GraphQLError(issues[0].message, {
    extensions: {
      code: 'BAD_USER_INPUT',
      issues,
      errors: issues.map((i) => `${i.path}: ${i.message}`),
    },
  });
}

export function pubConfig(doc: QualityConfigDoc): QualityConfig {
  const body = doc as unknown as QualityConfigBody;
  return {
    id: String(doc._id),
    lead_type: doc.lead_type as QualityLeadType,
    version: doc.version,
    status: doc.status as QualityConfigStatus,
    criteria: body.criteria,
    min_qualification_score: body.min_qualification_score ?? null,
    bands: body.bands,
    change_note: doc.change_note ?? '',
    revision: doc.revision ?? 0,
    created_by: actorOf(doc.created_by),
    updated_by: actorOf(doc.updated_by),
    published_by: doc.published_by ? actorOf(doc.published_by) : null,
    published_at: iso(doc.published_at),
    archived_at: iso(doc.archived_at),
    created_at: iso((doc as { created_at?: unknown }).created_at),
    updated_at: iso((doc as { updated_at?: unknown }).updated_at),
  };
}

const conflict = (message: string) => new GraphQLError(message, { extensions: { code: 'CONFLICT' } });

async function nextVersion(leadType: QualityLeadType): Promise<number> {
  const latest = await LeadQualityConfigModel.findOne({ lead_type: leadType }).sort({ version: -1 }).select('version').lean();
  return (latest?.version ?? 0) + 1;
}

async function latestPublished(leadType: QualityLeadType): Promise<QualityConfigDoc | null> {
  return LeadQualityConfigModel.findOne({ lead_type: leadType, status: 'PUBLISHED' }).sort({ version: -1 }).lean<QualityConfigDoc>();
}

/** Version 1 from the defaults, when the lead type has no configuration at all. A racing seed is harmless. */
async function seedDefault(leadType: QualityLeadType): Promise<boolean> {
  if (await LeadQualityConfigModel.exists({ lead_type: leadType })) return false;
  try {
    await LeadQualityConfigModel.create({
      lead_type: leadType,
      version: 1,
      status: 'PUBLISHED',
      ...DEFAULT_QUALITY_CONFIGS[leadType],
      change_note: 'Default scoring model',
      created_by: SYSTEM_ACTOR,
      updated_by: SYSTEM_ACTOR,
      published_by: SYSTEM_ACTOR,
      published_at: new Date(),
    });
    return true;
  } catch (error) {
    if (isDuplicateKeyError(error)) return false;
    throw error;
  }
}

export const leadQualityConfigService = {
  /** Seed version 1 for every lead type that has none; returns the ones seeded (their leads need a first score). */
  async seedDefaults(): Promise<QualityLeadType[]> {
    const seeded: QualityLeadType[] = [];
    for (const leadType of QUALITY_LEAD_TYPES) if (await seedDefault(leadType)) seeded.push(leadType);
    return seeded;
  },

  /** The configuration every score is worked out with. Seeds the default the first time it is asked for. */
  async published(leadType: QualityLeadType): Promise<QualityConfig> {
    let doc = await latestPublished(leadType);
    if (!doc) {
      await seedDefault(leadType);
      doc = await latestPublished(leadType);
    }
    if (!doc) throw new GraphQLError('No published scoring model for this lead type.', { extensions: { code: 'NOT_FOUND' } });
    return pubConfig(doc);
  },

  async draft(leadType: QualityLeadType): Promise<QualityConfig | null> {
    const doc = await LeadQualityConfigModel.findOne({ lead_type: leadType, status: 'DRAFT' }).lean<QualityConfigDoc>();
    return doc ? pubConfig(doc) : null;
  },

  /** Every version, newest first — the version history. */
  async versions(leadType: QualityLeadType): Promise<QualityConfig[]> {
    const docs = await LeadQualityConfigModel.find({ lead_type: leadType }).sort({ version: -1 }).limit(100).lean<QualityConfigDoc[]>();
    return docs.map(pubConfig);
  },

  /**
   * Create or replace the draft. A draft may still be short of 100% but never
   * over it. `revision` is the draft's revision the editor loaded; a stale one
   * is refused rather than silently overwriting another admin's work.
   */
  async saveDraft(
    leadType: QualityLeadType,
    input: QualityConfigInput,
    actor: QualityActor,
    options: { revision?: number | null; change_note?: string | null } = {}
  ): Promise<QualityConfig> {
    const body = toBody(input);
    assertValid(body, 'DRAFT');
    const changeNote = text(options.change_note).slice(0, MAX_NOTE);
    const existing = await LeadQualityConfigModel.findOne({ lead_type: leadType, status: 'DRAFT' }).select('revision').lean();
    let saved: QualityConfigDoc | null;
    if (existing) {
      if (typeof options.revision === 'number' && options.revision !== existing.revision) {
        throw conflict('Someone else saved this draft after you opened it. Reload to see their changes.');
      }
      saved = await LeadQualityConfigModel.findOneAndUpdate(
        { _id: existing._id, status: 'DRAFT', revision: existing.revision },
        { $set: { ...body, change_note: changeNote, updated_by: actor }, $inc: { revision: 1 } },
        { new: true }
      ).lean<QualityConfigDoc>();
      if (!saved) throw conflict('This draft changed while you were saving. Reload and try again.');
    } else {
      try {
        const created = await LeadQualityConfigModel.create({
          lead_type: leadType,
          version: await nextVersion(leadType),
          status: 'DRAFT',
          ...body,
          change_note: changeNote,
          revision: 1,
          created_by: actor,
          updated_by: actor,
        });
        saved = created.toObject() as QualityConfigDoc;
      } catch (error) {
        if (isDuplicateKeyError(error)) throw conflict('Another draft was started at the same time. Reload and edit that one.');
        throw error;
      }
    }
    await LeadQualityEventModel.create({ kind: 'CONFIG_DRAFT', entity_type: leadType, config_version: saved.version, actor, note: changeNote });
    return pubConfig(saved);
  },

  /** A draft started from a published or archived version — "edit" and "restore" in the version history. */
  async draftFromVersion(leadType: QualityLeadType, version: number, actor: QualityActor): Promise<QualityConfig> {
    const source = await LeadQualityConfigModel.findOne({ lead_type: leadType, version }).lean<QualityConfigDoc>();
    if (!source) throw new GraphQLError(`Version ${version} does not exist.`, { extensions: { code: 'NOT_FOUND' } });
    const body = source as unknown as QualityConfigBody;
    return this.saveDraft(
      leadType,
      { criteria: body.criteria as unknown as Record<string, unknown>[], min_qualification_score: body.min_qualification_score, bands: body.bands as unknown as Record<string, unknown>[] },
      actor,
      { change_note: `Started from version ${version}` }
    );
  },

  /**
   * Publish the draft: it must total exactly 100% with every criterion's
   * sub-criteria adding up to it. The new version becomes the one every score
   * uses; older published versions are archived (kept for history).
   */
  async publish(leadType: QualityLeadType, actor: QualityActor, options: { revision?: number | null; change_note?: string | null } = {}): Promise<QualityConfig> {
    const draft = await LeadQualityConfigModel.findOne({ lead_type: leadType, status: 'DRAFT' }).lean<QualityConfigDoc>();
    if (!draft) throw new GraphQLError('There is no draft to publish. Save a draft first.', { extensions: { code: 'BAD_USER_INPUT' } });
    if (typeof options.revision === 'number' && options.revision !== draft.revision) {
      throw conflict('The draft changed after you opened it. Reload to see the latest before publishing.');
    }
    assertValid(withKeys(draft as unknown as QualityConfigBody), 'PUBLISH');
    const note = text(options.change_note).slice(0, MAX_NOTE) || draft.change_note || '';
    const now = new Date();
    const published = await LeadQualityConfigModel.findOneAndUpdate(
      { _id: draft._id, status: 'DRAFT', revision: draft.revision },
      { $set: { status: 'PUBLISHED', published_by: actor, published_at: now, updated_by: actor, change_note: note } },
      { new: true }
    ).lean<QualityConfigDoc>();
    if (!published) throw conflict('The draft changed while publishing. Reload and try again.');
    await LeadQualityConfigModel.updateMany(
      { lead_type: leadType, status: 'PUBLISHED', version: { $lt: published.version } },
      { $set: { status: 'ARCHIVED', archived_at: now } }
    );
    await LeadQualityEventModel.create({ kind: 'CONFIG_PUBLISH', entity_type: leadType, config_version: published.version, actor, note });
    return pubConfig(published);
  },

  async discardDraft(leadType: QualityLeadType, actor: QualityActor): Promise<boolean> {
    const draft = await LeadQualityConfigModel.findOneAndDelete({ lead_type: leadType, status: 'DRAFT' }).lean<QualityConfigDoc>();
    if (!draft) return false;
    await LeadQualityEventModel.create({ kind: 'CONFIG_DISCARD', entity_type: leadType, config_version: draft.version, actor });
    return true;
  },

  /** Check a configuration without saving it — the console's live check and MCP's dry run. */
  validate(input: QualityConfigInput, mode: QualityValidationMode): QualityIssue[] {
    return validateQualityConfig(toBody(input), mode);
  },
};
