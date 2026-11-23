import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { requestIdentity } from '@observability/requestIdentity';
import { isDuplicateKeyError } from '@utils/mongo-error';
import { LEAD_NAME_FIELDS } from '@modules/crm/crm/leadModels';
import { runAutoChecks, type CheckOutcome } from './leadQuality.checks';
import { leadFacts, leadModel, loadLead } from './leadQuality.lead';
import {
  LeadQualityEventModel,
  LeadQualityModel,
  type EvidenceVia,
  type LeadQualityDoc,
  type QualityEventDoc,
  type QualityOrigin,
  type ScoreTrigger,
} from './leadQuality.model';
import { enabledItems, scoreLead, type EvidenceStatus, type QualityLeadType, type QualityResult } from './leadQuality.rules';
import { leadQualityConfigService, SYSTEM_ACTOR, type QualityActor, type QualityConfig } from './leadQualityConfig.service';

/**
 * The one scoring service every surface uses — lead create and edit, the
 * detail page, listings, bulk recalculation, research candidates and MCP.
 *
 * A lead's score is always worked out from the PUBLISHED configuration and the
 * evidence recorded against each item: people (console or MCP) decide items
 * with evidence; the automatic checks fill the items nobody decided. Nothing
 * sets a score directly, so a score can only move through recorded evidence,
 * and every change is written to the append-only history.
 */

const LOG = 'lead-quality';
const MAX_DECISIONS = 50;
const MAX_TEXT = 1000;
const MAX_URL = 500;
const WRITE_ATTEMPTS = 3;

export interface EvidenceDecision {
  item_key: string;
  status: EvidenceStatus;
  evidence?: string | null;
  source_url?: string | null;
  notes?: string | null;
}

export interface StoredEvidence {
  item_key: string;
  status: EvidenceStatus;
  evidence: string;
  source_url: string;
  notes: string;
  via: EvidenceVia;
  actor: QualityActor;
  decided_at: Date;
}

export interface ScoreOptions {
  trigger: ScoreTrigger;
  actor?: QualityActor;
  /** Also run the checks that call Instagram, Google Maps and the website. */
  external?: boolean;
}

export interface ScoreOutcome {
  result: QualityResult;
  skipped_checks: string[];
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const notFound = (what: string) => new GraphQLError(`${what} not found`, { extensions: { code: 'NOT_FOUND' } });

/** Plain text only: control characters out, trimmed, capped. */
export function cleanText(value: unknown, max = MAX_TEXT): string {
  return typeof value === 'string' ? value.replaceAll(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim().slice(0, max) : '';
}

/** An http(s) link, or '' — the detail page renders it as a link, so nothing else is stored. */
export function cleanUrl(value: unknown): string {
  const text = cleanText(value, MAX_URL);
  if (!text) return '';
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

/** Whoever the current request belongs to, for score events nobody triggered by hand. */
export function requestActor(): QualityActor {
  const user = requestIdentity.current()?.user;
  return user ? { id: user.id, name: user.email ?? '' } : SYSTEM_ACTOR;
}

export const statusMap = (items: readonly StoredEvidence[]) => Object.fromEntries(items.map((item) => [item.item_key, item.status]));

/** Automatic outcomes replace earlier automatic ones; a person's decision is never overwritten by a check. */
export function mergeChecks(items: readonly StoredEvidence[], outcomes: ReadonlyMap<string, CheckOutcome>, now: Date): StoredEvidence[] {
  const human = new Set(items.filter((item) => item.via !== 'SYSTEM').map((item) => item.item_key));
  const kept = items.filter((item) => item.via !== 'SYSTEM' || !outcomes.has(item.item_key) || human.has(item.item_key));
  const added: StoredEvidence[] = [];
  for (const [item_key, check] of outcomes) {
    if (human.has(item_key)) continue;
    added.push({ item_key, status: check.status, evidence: check.evidence, source_url: check.source_url, notes: '', via: 'SYSTEM', actor: SYSTEM_ACTOR, decided_at: now });
  }
  return [...kept, ...added];
}

async function readRecord(entity_type: QualityLeadType, lead_id: string): Promise<LeadQualityDoc | null> {
  return LeadQualityModel.findOne({ entity_type, lead_id }).lean<LeadQualityDoc>();
}

const evidenceOf = (record: LeadQualityDoc | null): StoredEvidence[] => (record?.items ?? []) as unknown as StoredEvidence[];

interface RecordWrite<T> {
  items: StoredEvidence[];
  set: Record<string, unknown>;
  value: T;
}

/**
 * Read-modify-write of a lead's evidence, retried when another write landed in
 * between (a person verifying while a recalculation runs). `revision` is the
 * version both writers compare — not a timestamp, two writes can share a millisecond.
 */
async function writeRecord<T>(
  entity_type: QualityLeadType,
  lead_id: string,
  build: (current: StoredEvidence[]) => RecordWrite<T>
): Promise<T> {
  for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
    const current = await readRecord(entity_type, lead_id);
    const { items, set, value } = build(evidenceOf(current));
    if (current) {
      const res = await LeadQualityModel.updateOne(
        { _id: current._id, revision: current.revision ?? 0 },
        { $set: { items, ...set }, $inc: { revision: 1 } }
      );
      if (res.matchedCount > 0) return value;
    } else {
      try {
        await LeadQualityModel.create({ entity_type, lead_id, items, ...set, revision: 1 });
        return value;
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
  }
  throw new GraphQLError('This lead was being scored by someone else at the same moment. Try again.', { extensions: { code: 'CONFLICT' } });
}

function summaryOf(result: QualityResult, configVersion: number, now: Date) {
  return {
    score: result.score,
    classification: result.classification,
    classification_label: result.classification_label,
    tone: result.tone,
    qualification: result.qualification,
    verification: result.verification,
    failed_gates: result.gates.filter((g) => g.state === 'FAILED').length,
    pending_gates: result.gates.filter((g) => g.state === 'PENDING').length,
    pending_items: result.pending_items,
    config_version: configVersion,
    scored_at: now,
  };
}

const QUIET_TRIGGERS: readonly ScoreTrigger[] = ['BACKFILL', 'CONFIG_PUBLISH', 'UPDATE'];

/** A score event when the score or qualification moved, or when someone asked for this score. */
async function recordScoreEvent(
  entity_type: QualityLeadType,
  lead_id: string,
  before: { score: number | null; qualification: string },
  result: QualityResult,
  config: QualityConfig,
  options: ScoreOptions
): Promise<void> {
  const moved = before.score !== result.score || before.qualification !== result.qualification;
  if (!moved && QUIET_TRIGGERS.includes(options.trigger)) return;
  await LeadQualityEventModel.create({
    kind: 'SCORE',
    entity_type,
    lead_id,
    trigger: options.trigger,
    score_before: before.score,
    score_after: result.score,
    classification: result.classification_label,
    qualification: result.qualification,
    config_version: config.version,
    actor: options.actor ?? SYSTEM_ACTOR,
  });
}

export function checkDecisions(decisions: readonly EvidenceDecision[], known: ReadonlySet<string>, via: EvidenceVia): void {
  if (decisions.length === 0) throw badInput('Send at least one item to decide.');
  if (decisions.length > MAX_DECISIONS) throw badInput(`Decide at most ${MAX_DECISIONS} items at a time.`);
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const decision of decisions) {
    const key = decision.item_key;
    if (!known.has(key)) problems.push(`${key}: not an item of the published scoring model. Read the lead's quality details for the item keys.`);
    if (seen.has(key)) problems.push(`${key}: sent twice.`);
    seen.add(key);
    const evidence = cleanText(decision.evidence);
    const sourceUrl = cleanUrl(decision.source_url);
    if (decision.source_url && !sourceUrl) problems.push(`${key}: the source must be an http(s) link.`);
    if (decision.status === 'VERIFIED' && evidence.length < 3) problems.push(`${key}: say what proves it (the evidence) before marking it verified.`);
    if (decision.status === 'VERIFIED' && via !== 'MANUAL' && !sourceUrl) problems.push(`${key}: an AI-verified item needs the public source link it was verified from.`);
    if (decision.status === 'FAILED' && evidence.length < 3) problems.push(`${key}: say why it is not met.`);
  }
  if (problems.length > 0) {
    throw new GraphQLError(problems[0], { extensions: { code: 'BAD_USER_INPUT', errors: problems } });
  }
}

export const leadQualityService = {
  /** Score a lead now from its evidence and the published configuration, and store the result everywhere it is shown. */
  async score(entity_type: QualityLeadType, lead_id: string, options: ScoreOptions): Promise<ScoreOutcome> {
    const lead = await loadLead(entity_type, lead_id);
    if (!lead) throw notFound('Lead');
    const config = await leadQualityConfigService.published(entity_type);
    const facts = leadFacts(entity_type, lead);
    const actor = options.actor ?? SYSTEM_ACTOR;
    const previous = await readRecord(entity_type, lead_id);
    const human = new Set(evidenceOf(previous).filter((i) => i.via !== 'SYSTEM').map((i) => i.item_key));
    const checkable = enabledItems(config).filter((item) => !human.has(item.key));
    const run = await runAutoChecks(facts, checkable, { external: options.external === true, actor: { id: actor.id ?? 'SYSTEM', email: actor.name } });
    const now = new Date();
    const result = await writeRecord(entity_type, lead_id, (current) => {
      const items = mergeChecks(current, run.outcomes, now);
      const scored = scoreLead(config, statusMap(items));
      return { items, set: { result: scored, score: scored.score, config_version: config.version, scored_at: now }, value: scored };
    });
    await leadModel(entity_type).updateOne({ _id: lead._id }, { $set: { quality: summaryOf(result, config.version, now) } }, { timestamps: false });
    const previousResult = previous?.result as QualityResult | null | undefined;
    const before = { score: previous?.score ?? null, qualification: previousResult?.qualification ?? '' };
    await recordScoreEvent(entity_type, lead_id, before, result, config, options);
    return { result, skipped_checks: run.skipped };
  },

  /**
   * Rescore after a lead was created or edited. Never fails the save that
   * called it: a scoring problem is logged and the next recalculation retries.
   */
  async refreshAfterSave(entity_type: QualityLeadType, lead_id: string, trigger: 'CREATE' | 'UPDATE'): Promise<void> {
    try {
      await this.score(entity_type, lead_id, { trigger, actor: requestActor() });
    } catch (error) {
      logs.server.error(LOG, 'refresh', { error, entity_type, lead_id, msg: 'scoring after save failed; the lead keeps its last score' });
    }
  },

  /** Record decisions (with evidence) on a lead's items, then rescore. VERIFIED earns points; PENDING clears a decision. */
  async recordEvidence(
    entity_type: QualityLeadType,
    lead_id: string,
    decisions: readonly EvidenceDecision[],
    actor: QualityActor,
    via: EvidenceVia
  ): Promise<ScoreOutcome> {
    if (!(await loadLead(entity_type, lead_id))) throw notFound('Lead');
    const config = await leadQualityConfigService.published(entity_type);
    checkDecisions(decisions, new Set(enabledItems(config).map((item) => item.key)), via);
    const now = new Date();
    const changes: Array<{ key: string; before: string; decision: EvidenceDecision }> = [];
    await writeRecord(entity_type, lead_id, (current) => {
      changes.length = 0;
      const byKey = new Map(current.map((item) => [item.item_key, item]));
      for (const decision of decisions) {
        changes.push({ key: decision.item_key, before: byKey.get(decision.item_key)?.status ?? 'PENDING', decision });
        if (decision.status === 'PENDING') {
          byKey.delete(decision.item_key);
          continue;
        }
        byKey.set(decision.item_key, {
          item_key: decision.item_key,
          status: decision.status,
          evidence: cleanText(decision.evidence),
          source_url: cleanUrl(decision.source_url),
          notes: cleanText(decision.notes),
          via,
          actor,
          decided_at: now,
        });
      }
      return { items: [...byKey.values()], set: {}, value: null };
    });
    await LeadQualityEventModel.insertMany(
      changes.map(({ key, before, decision }) => ({
        kind: 'EVIDENCE',
        entity_type,
        lead_id,
        item_key: key,
        status_before: before,
        status_after: decision.status,
        evidence: cleanText(decision.evidence),
        source_url: cleanUrl(decision.source_url),
        via,
        actor,
        config_version: config.version,
      }))
    );
    return this.score(entity_type, lead_id, { trigger: 'EVIDENCE', actor });
  },

  /** Everything the detail page and MCP show: the stored result, the evidence behind it and the configuration. */
  async details(entity_type: QualityLeadType, lead_id: string) {
    const lead = await loadLead(entity_type, lead_id);
    if (!lead) throw notFound('Lead');
    const [config, record] = await Promise.all([leadQualityConfigService.published(entity_type), readRecord(entity_type, lead_id)]);
    const evidence = evidenceOf(record).map((item) => ({
      ...item,
      decided_at: item.decided_at instanceof Date ? item.decided_at.toISOString() : String(item.decided_at ?? ''),
    }));
    return {
      entity_type,
      lead_id,
      lead_name: String(lead[LEAD_NAME_FIELDS[entity_type]] ?? ''),
      result: (record?.result as QualityResult | null) ?? null,
      evidence,
      scored_version: record?.config_version ?? null,
      published_version: config.version,
      stale: !record || record.config_version !== config.version,
      scored_at: record?.scored_at instanceof Date ? record.scored_at.toISOString() : null,
      origin: (record?.origin ?? 'MANUAL') as QualityOrigin,
      config,
    };
  },

  /** The lead's quality history, newest first. */
  async history(entity_type: QualityLeadType, lead_id: string, limit = 50) {
    const rows = await LeadQualityEventModel.find({ entity_type, lead_id })
      .sort({ created_at: -1 })
      .limit(Math.min(Math.max(limit, 1), 200))
      .lean<QualityEventDoc[]>();
    return rows.map((row) => ({ ...row, id: String(row._id), created_at: row.created_at.toISOString() }));
  },

  /** Mark where a lead came from (a research candidate) — analytics compare research and manual leads. */
  async markOrigin(entity_type: QualityLeadType, lead_id: string, origin: QualityOrigin, candidate_id: string | null): Promise<void> {
    await LeadQualityModel.updateOne({ entity_type, lead_id }, { $set: { origin, candidate_id }, $setOnInsert: { items: [] } }, { upsert: true });
  },

  /** The lead was deleted: its evidence goes with it; the history stays. */
  async removeForLead(entity_type: QualityLeadType, lead_id: string): Promise<void> {
    await LeadQualityModel.deleteOne({ entity_type, lead_id });
  },
};
