import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { runTableQuery, type TableEntityConfig, type TableQueryInput } from '@utils/table-query';
import { findInstagramDuplicates, findLeadDuplicates } from '@modules/crm/leadDuplicate/leadDuplicate.service';
import { runAutoChecks, type CheckOptions } from '@modules/crm/leadQuality/leadQuality.checks';
import { LeadQualityEventModel, LeadQualityModel, type EvidenceVia } from '@modules/crm/leadQuality/leadQuality.model';
import { enabledItems, scoreLead, type QualityLeadType, type QualityResult } from '@modules/crm/leadQuality/leadQuality.rules';
import {
  checkDecisions,
  cleanText,
  cleanUrl,
  leadQualityService,
  mergeChecks,
  statusMap,
  type EvidenceDecision,
  type StoredEvidence,
} from '@modules/crm/leadQuality/leadQuality.service';
import { leadQualityConfigService, type QualityActor, type QualityConfig } from '@modules/crm/leadQuality/leadQualityConfig.service';
import { candidateFacts, cleanCandidate, type CandidateInput, type CleanCandidate } from './leadResearch.candidate';
import { LeadCandidateModel, type CandidateOrigin, type LeadCandidateDoc } from './leadResearch.model';
import { createCrmLead } from './leadResearch.promote';

/**
 * CRM › Lead Research queue: save researched candidates, record evidence on
 * them, approve them into the CRM or reject them. Candidates are scored with
 * the same published configuration, automatic checks and evidence rules as CRM
 * leads, so a candidate's score is what the lead will start with.
 */

export const MAX_CANDIDATES_PER_CALL = 50;
const MAX_IDS = 50;
const WRITE_ATTEMPTS = 3;

export interface SaveOptions {
  origin: CandidateOrigin;
  via: EvidenceVia;
  job_id?: string | null;
  /** Also run the checks that call Instagram, Google Maps and the website. */
  external?: boolean;
}

export type SaveInput = CandidateInput & { prefetched?: CheckOptions['prefetched'] };

export interface SaveReport {
  saved: LeadCandidateDoc[];
  duplicates: LeadCandidateDoc[];
  already_queued: Array<{ index: number; name: string; candidate_id: string }>;
  refused: Array<{ index: number; name: string; reasons: string[] }>;
}

interface CandidateDuplicate {
  entity_type: string;
  lead_id: string;
  lead_name: string;
  match: string;
}

const badInput = (message: string) => new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
const now = () => new Date();

/** Existing CRM leads this candidate would duplicate (phone, email, website or Instagram). */
export async function crmDuplicatesOf(c: Pick<CleanCandidate, 'phones' | 'emails' | 'website' | 'instagram_handle'>): Promise<CandidateDuplicate[]> {
  const contacts = [...c.phones.map((mobile_number) => ({ mobile_number })), ...c.emails.map((email) => ({ email }))];
  const [byContact, byInstagram] = await Promise.all([
    findLeadDuplicates({ contacts, website: c.website }),
    c.instagram_handle ? findInstagramDuplicates(c.instagram_handle) : Promise.resolve([]),
  ]);
  const rows: CandidateDuplicate[] = [
    ...byContact.map((m) => ({ entity_type: m.entity_type, lead_id: m.lead_id, lead_name: m.lead_name, match: `${m.field} ${m.value}` })),
    ...byInstagram.map((m) => ({ entity_type: m.entity_type, lead_id: m.lead_id, lead_name: m.lead_name, match: `INSTAGRAM @${c.instagram_handle}` })),
  ];
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.entity_type}:${row.lead_id}:${row.match}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toStored(decisions: readonly EvidenceDecision[], via: EvidenceVia, actor: QualityActor, at: Date): StoredEvidence[] {
  return decisions
    .filter((d) => d.status !== 'PENDING')
    .map((d) => ({
      item_key: d.item_key,
      status: d.status,
      evidence: cleanText(d.evidence),
      source_url: cleanUrl(d.source_url),
      notes: cleanText(d.notes),
      via,
      actor,
      decided_at: at,
    }));
}

/** Score a candidate from its evidence plus fresh automatic checks on the items nobody decided. */
async function scoreCandidate(
  config: QualityConfig,
  facts: ReturnType<typeof candidateFacts>,
  evidence: StoredEvidence[],
  actor: QualityActor,
  options: Pick<CheckOptions, 'external' | 'prefetched'>
): Promise<{ items: StoredEvidence[]; result: QualityResult; skipped: string[] }> {
  const decided = new Set(evidence.filter((e) => e.via !== 'SYSTEM').map((e) => e.item_key));
  const checkable = enabledItems(config).filter((item) => !decided.has(item.key));
  const run = await runAutoChecks(facts, checkable, { ...options, actor: { id: actor.id ?? 'SYSTEM', email: actor.name } });
  const items = mergeChecks(evidence, run.outcomes, now());
  return { items, result: scoreLead(config, statusMap(items)), skipped: run.skipped };
}

const resultFields = (result: QualityResult, config: QualityConfig) => ({
  result,
  score: result.score,
  qualification: result.qualification,
  classification_label: result.classification_label,
  tone: result.tone,
  config_version: config.version,
});

async function saveOne(lead_type: QualityLeadType, input: SaveInput, index: number, config: QualityConfig, actor: QualityActor, options: SaveOptions, report: SaveReport) {
  const { candidate, problems } = cleanCandidate(input, options.origin === 'MCP');
  const label = cleanText(input.name, 120);
  if (!candidate) {
    report.refused.push({ index, name: label, reasons: problems });
    return;
  }
  // A second sighting is reported as already queued whatever else it carries.
  const queued = candidate.keys.length > 0 ? await LeadCandidateModel.findOne({ keys: { $in: candidate.keys } }).select('_id').lean() : null;
  if (queued) {
    report.already_queued.push({ index, name: candidate.name, candidate_id: String(queued._id) });
    return;
  }
  const decisions = input.evidence ?? [];
  if (decisions.length > 0) {
    try {
      checkDecisions(decisions, new Set(enabledItems(config).map((i) => i.key)), options.via);
    } catch (error) {
      const listed = (error as GraphQLError).extensions?.errors;
      report.refused.push({ index, name: candidate.name, reasons: Array.isArray(listed) ? listed.map(String) : [(error as Error).message] });
      return;
    }
  }
  const duplicates = await crmDuplicatesOf(candidate);
  const facts = candidateFacts(lead_type, 'new', candidate);
  const scored = await scoreCandidate(config, facts, toStored(decisions, options.via, actor, now()), actor, {
    external: options.external === true,
    prefetched: input.prefetched,
  });
  const doc = await LeadCandidateModel.create({
    lead_type,
    job_id: options.job_id ?? null,
    origin: options.origin,
    ...candidate,
    items: scored.items,
    ...resultFields(scored.result, config),
    duplicates,
    status: duplicates.length > 0 ? 'DUPLICATE' : 'NEW',
    skipped_checks: scored.skipped,
    created_by: actor,
    revision: 1,
  });
  const saved = doc.toObject<LeadCandidateDoc>();
  (duplicates.length > 0 ? report.duplicates : report.saved).push(saved);
}

function validIds(ids: readonly string[]): string[] {
  if (ids.length === 0) throw badInput('Pick at least one candidate.');
  if (ids.length > MAX_IDS) throw badInput(`Act on at most ${MAX_IDS} candidates at a time.`);
  const valid = ids.filter((id) => Types.ObjectId.isValid(id));
  if (valid.length !== ids.length) throw badInput('One of the candidate ids is not valid.');
  return [...new Set(valid)];
}

export interface ApproveOutcome {
  candidate_id: string;
  name: string;
  outcome: 'ADDED' | 'DUPLICATE' | 'NOT_QUALIFIED' | 'SKIPPED' | 'FAILED';
  crm_lead_id: string | null;
  message: string;
}

/** The candidate's people/AI evidence carried over to its new lead, then the lead is scored. */
async function carryEvidence(c: LeadCandidateDoc, leadId: string, actor: QualityActor): Promise<void> {
  const lead_type = c.lead_type as QualityLeadType;
  const items = ((c.items ?? []) as unknown as StoredEvidence[]).filter((item) => item.via !== 'SYSTEM');
  await LeadQualityModel.updateOne(
    { entity_type: lead_type, lead_id: leadId },
    { $set: { items, origin: 'RESEARCH', candidate_id: String(c._id) }, $inc: { revision: 1 } },
    { upsert: true }
  );
  if (items.length > 0) {
    await LeadQualityEventModel.insertMany(
      items.map((item) => ({
        kind: 'EVIDENCE',
        entity_type: lead_type,
        lead_id: leadId,
        item_key: item.item_key,
        status_before: 'PENDING',
        status_after: item.status,
        evidence: item.evidence,
        source_url: item.source_url,
        via: item.via,
        actor: item.actor,
        note: `Carried over from Lead Research candidate ${String(c._id)}`,
      }))
    );
  }
  await leadQualityService.score(lead_type, leadId, { trigger: 'RESEARCH', actor });
}

function refusalReason(result: QualityResult): string {
  const failed = result.gates.filter((g) => g.state === 'FAILED').map((g) => g.name);
  const pending = result.gates.filter((g) => g.state === 'PENDING').map((g) => g.name);
  const parts = [`Scored ${result.score}/100 (${result.qualification}).`];
  if (failed.length) parts.push(`Failed gates: ${failed.join(', ')}.`);
  if (pending.length) parts.push(`Gates still to verify: ${pending.join(', ')}.`);
  if (result.min_qualification_score !== null && result.score < result.min_qualification_score) {
    parts.push(`Needs at least ${result.min_qualification_score}.`);
  }
  return parts.join(' ');
}

async function approveOne(id: string, actor: QualityActor, allowUnqualified: boolean, note: string): Promise<ApproveOutcome> {
  const doc = await LeadCandidateModel.findById(id).lean<LeadCandidateDoc>();
  const base = { candidate_id: id, name: doc?.name ?? '', crm_lead_id: null };
  if (!doc) return { ...base, outcome: 'FAILED', message: 'Candidate not found.' };
  if (doc.status !== 'NEW') return { ...base, outcome: 'SKIPPED', crm_lead_id: doc.crm_lead_id ?? null, message: `Already ${doc.status}.` };
  const lead_type = doc.lead_type as QualityLeadType;
  const duplicates = await crmDuplicatesOf(doc as unknown as CleanCandidate);
  if (duplicates.length > 0) {
    await LeadCandidateModel.updateOne({ _id: id, status: 'NEW' }, { $set: { status: 'DUPLICATE', duplicates } });
    return { ...base, outcome: 'DUPLICATE', message: `Already in the CRM: ${duplicates[0].lead_name} (${duplicates[0].match}).` };
  }
  const result = doc.result as QualityResult | null;
  if (!allowUnqualified && result?.qualification !== 'QUALIFIED') {
    return { ...base, outcome: 'NOT_QUALIFIED', message: result ? refusalReason(result) : 'Not scored yet.' };
  }
  const claimed = await LeadCandidateModel.findOneAndUpdate(
    { _id: id, status: 'NEW' },
    { $set: { status: 'ADDED', decided_by: actor, decided_at: now(), decision_note: note } },
    { new: true }
  ).lean<LeadCandidateDoc>();
  if (!claimed) return { ...base, outcome: 'SKIPPED', message: 'Someone else acted on it at the same moment.' };
  try {
    const leadId = await createCrmLead(lead_type, claimed);
    await LeadCandidateModel.updateOne({ _id: id }, { $set: { crm_lead_id: leadId } });
    await carryEvidence(claimed, leadId, actor);
    return { ...base, outcome: 'ADDED', crm_lead_id: leadId, message: 'Added to the CRM.' };
  } catch (error) {
    const gqlError = error as GraphQLError;
    const isDuplicate = gqlError.extensions?.code === 'DUPLICATE_LEAD';
    await LeadCandidateModel.updateOne({ _id: id }, { $set: { status: isDuplicate ? 'DUPLICATE' : 'NEW', decided_by: null, decided_at: null } });
    return { ...base, outcome: isDuplicate ? 'DUPLICATE' : 'FAILED', message: gqlError.message ?? 'The CRM refused this lead.' };
  }
}

const CANDIDATE_TABLE: TableEntityConfig = {
  searchFields: ['name', 'city', 'area', 'instagram_handle', 'website', 'category'],
  sortFields: { score: 'score', created_at: 'created_at', name: 'name', city: 'city', status: 'status', qualification: 'qualification', lead_type: 'lead_type' },
  filterFields: {
    lead_type: { type: 'enum' },
    status: { type: 'enum' },
    qualification: { type: 'enum' },
    origin: { type: 'enum' },
    job_id: { type: 'enum' },
    city: { type: 'string' },
    score: { type: 'number' },
    created_at: { type: 'date' },
  },
  defaultSort: { created_at: -1 },
};

export const leadResearchService = {
  /** Validate, de-duplicate and score researched candidates, then queue them. Nothing is added to the CRM here. */
  async saveCandidates(lead_type: QualityLeadType, inputs: readonly SaveInput[], actor: QualityActor, options: SaveOptions): Promise<SaveReport> {
    if (inputs.length === 0) throw badInput('Send at least one candidate.');
    if (inputs.length > MAX_CANDIDATES_PER_CALL) throw badInput(`Send at most ${MAX_CANDIDATES_PER_CALL} candidates at a time.`);
    const config = await leadQualityConfigService.published(lead_type);
    const report: SaveReport = { saved: [], duplicates: [], already_queued: [], refused: [] };
    for (const [index, input] of inputs.entries()) await saveOne(lead_type, input, index, config, actor, options, report);
    return report;
  },

  /** Record evidence on a queued candidate and score it again (optionally with the external checks). */
  async verifyCandidate(id: string, decisions: readonly EvidenceDecision[], actor: QualityActor, via: EvidenceVia, external: boolean) {
    for (let attempt = 1; attempt <= WRITE_ATTEMPTS; attempt += 1) {
      const doc = await LeadCandidateModel.findById(id).lean<LeadCandidateDoc>();
      if (!doc) throw new GraphQLError('Candidate not found', { extensions: { code: 'NOT_FOUND' } });
      const lead_type = doc.lead_type as QualityLeadType;
      const config = await leadQualityConfigService.published(lead_type);
      if (decisions.length > 0) checkDecisions(decisions, new Set(enabledItems(config).map((i) => i.key)), via);
      const byKey = new Map(((doc.items ?? []) as unknown as StoredEvidence[]).map((item) => [item.item_key, item]));
      for (const decision of decisions) {
        if (decision.status === 'PENDING') byKey.delete(decision.item_key);
        else for (const stored of toStored([decision], via, actor, now())) byKey.set(stored.item_key, stored);
      }
      const facts = candidateFacts(lead_type, String(doc._id), doc as unknown as CleanCandidate);
      const scored = await scoreCandidate(config, facts, [...byKey.values()], actor, { external });
      const res = await LeadCandidateModel.updateOne(
        { _id: id, revision: doc.revision ?? 0 },
        { $set: { items: scored.items, ...resultFields(scored.result, config), skipped_checks: scored.skipped }, $inc: { revision: 1 } }
      );
      if (res.matchedCount > 0) return LeadCandidateModel.findById(id).lean<LeadCandidateDoc>();
    }
    throw new GraphQLError('This candidate changed while it was being scored. Try again.', { extensions: { code: 'CONFLICT' } });
  },

  /**
   * Add candidates to the CRM. Only QUALIFIED, non-duplicate candidates are
   * added unless `allow_unqualified` (a person's explicit call); each lead is
   * made by the CRM's own create function and starts with the candidate's evidence.
   */
  async approveCandidates(ids: readonly string[], actor: QualityActor, options: { allow_unqualified?: boolean; note?: string | null }): Promise<ApproveOutcome[]> {
    const outcomes: ApproveOutcome[] = [];
    const note = cleanText(options.note, 300);
    for (const id of validIds(ids)) outcomes.push(await approveOne(id, actor, options.allow_unqualified === true, note));
    return outcomes;
  },

  async rejectCandidates(ids: readonly string[], actor: QualityActor, note?: string | null): Promise<number> {
    const res = await LeadCandidateModel.updateMany(
      { _id: { $in: validIds(ids) }, status: 'NEW' },
      { $set: { status: 'REJECTED', decided_by: actor, decided_at: now(), decision_note: cleanText(note, 300) } }
    );
    return res.modifiedCount;
  },

  async candidate(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return LeadCandidateModel.findById(id).lean<LeadCandidateDoc>();
  },

  table(input?: TableQueryInput | null) {
    return runTableQuery<LeadCandidateDoc>(LeadCandidateModel, {}, input, CANDIDATE_TABLE);
  },

  /** Would this lead be a duplicate? Existing CRM leads and queued candidates that share an identity. */
  async duplicateCheck(lead_type: QualityLeadType, input: CandidateInput) {
    const { candidate, problems } = cleanCandidate(input, false);
    if (!candidate) throw new GraphQLError(problems[0] ?? 'Nothing to check.', { extensions: { code: 'BAD_USER_INPUT', errors: problems } });
    const [crm, queued] = await Promise.all([
      crmDuplicatesOf(candidate),
      candidate.keys.length > 0 ? LeadCandidateModel.find({ keys: { $in: candidate.keys } }).select('_id name lead_type status').limit(10).lean() : [],
    ]);
    return {
      lead_type,
      is_duplicate: crm.length > 0,
      crm_matches: crm,
      queued_candidates: queued.map((q) => ({ candidate_id: String(q._id), name: q.name, lead_type: q.lead_type, status: q.status })),
    };
  },
};
