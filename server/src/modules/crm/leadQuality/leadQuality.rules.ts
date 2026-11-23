/**
 * Lead Quality Score rules: what a valid scoring configuration is, and how a
 * lead's 0-100 score, classification, mandatory gates and qualification are
 * worked out from its evidence.
 *
 * This file imports nothing on purpose. The server scores every lead with it,
 * and `node scripts/generate-lead-quality-rules.mjs` copies it into the CRM
 * console so the settings form validates and totals exactly as the server
 * will. Edit it here and regenerate; CI fails when the copy is stale.
 *
 * Arithmetic is done in hundredths (integers), so 33.33 + 33.33 + 33.34 is
 * exactly 100 and a score can never drift past 100 through rounding.
 */

export const QUALITY_MAX_SCORE = 100;
const SCALE = 100;
const MAX_TOTAL = QUALITY_MAX_SCORE * SCALE;
const MAX_THRESHOLD = 10_000_000;

export const QUALITY_LEAD_TYPES = ['HOST_LEAD', 'VENUE_LEAD', 'COMMUNITY_LEAD', 'CREATOR_LEAD', 'ECOMM_LEAD'] as const;
export type QualityLeadType = (typeof QUALITY_LEAD_TYPES)[number];

/** A scored item is VERIFIED (earns its points), PENDING (unknown, earns 0) or FAILED (checked and not met, earns 0). */
export const EVIDENCE_STATUSES = ['VERIFIED', 'PENDING', 'FAILED'] as const;
export type EvidenceStatus = (typeof EVIDENCE_STATUSES)[number];

/**
 * Checks the server can run by itself against a real source. NONE means a
 * person (in the console, or an AI assistant through MCP) records the evidence.
 */
export const AUTO_CHECKS = [
  'NONE',
  'CRM_UNIQUENESS',
  'EMAIL_DELIVERABLE',
  'INSTAGRAM_BUSINESS_PROFILE',
  'INSTAGRAM_FOLLOWERS_MIN',
  'INSTAGRAM_RECENT_POST_DAYS',
  'GOOGLE_MAPS_LISTING',
  'GOOGLE_REVIEWS_MIN',
  'WEBSITE_REACHABLE',
] as const;
export type AutoCheck = (typeof AUTO_CHECKS)[number];

/** The checks that compare against a number the admin sets (followers, days, reviews). */
export const THRESHOLD_CHECKS: readonly AutoCheck[] = ['INSTAGRAM_FOLLOWERS_MIN', 'INSTAGRAM_RECENT_POST_DAYS', 'GOOGLE_REVIEWS_MIN'];

export const BAND_TONES = ['success', 'warning', 'error'] as const;
export type BandTone = (typeof BAND_TONES)[number];

export const QUALITY_LIMITS = { criteria: 30, subCriteria: 12, bands: 8, name: 80, guidance: 300, key: 40 } as const;

export interface QualitySubCriterion {
  key: string;
  name: string;
  points: number;
  /** A gate: the lead cannot qualify until this item is verified. */
  mandatory: boolean;
  auto_check: AutoCheck;
  threshold: number | null;
  guidance: string;
}

export interface QualityCriterion {
  key: string;
  name: string;
  weightage: number;
  enabled: boolean;
  /** A gate: the lead cannot qualify until at least one item of this criterion is verified. */
  mandatory: boolean;
  /** Only for a criterion without sub-criteria (it is then scored as one item). */
  auto_check: AutoCheck;
  threshold: number | null;
  guidance: string;
  sub_criteria: QualitySubCriterion[];
}

export interface QualityBand {
  key: string;
  label: string;
  /** The lowest score in this band. */
  min: number;
  tone: BandTone;
}

export interface QualityConfigBody {
  criteria: QualityCriterion[];
  /** Null: qualification depends on the mandatory gates only (a verified Host qualifies on any score). */
  min_qualification_score: number | null;
  bands: QualityBand[];
}

export type QualityValidationMode = 'DRAFT' | 'PUBLISH';

export type QualityIssueCode =
  | 'NO_CRITERIA'
  | 'TOO_MANY'
  | 'NAME_REQUIRED'
  | 'NAME_TOO_LONG'
  | 'KEY_INVALID'
  | 'KEY_DUPLICATE'
  | 'NOT_A_NUMBER'
  | 'TOO_MANY_DECIMALS'
  | 'OUT_OF_RANGE'
  | 'SUB_SUM_OVER'
  | 'SUB_SUM_MISMATCH'
  | 'TOTAL_OVER'
  | 'TOTAL_UNDER'
  | 'AUTO_CHECK_INVALID'
  | 'PARENT_AUTO_CHECK'
  | 'THRESHOLD_REQUIRED'
  | 'THRESHOLD_UNUSED'
  | 'BAND_ZERO_MISSING'
  | 'BAND_TONE_INVALID';

export interface QualityIssue {
  /** Where in the configuration, e.g. `criteria.2.sub_criteria.0.points`. */
  path: string;
  code: QualityIssueCode;
  message: string;
  /** The number the message is about (the excess, the remainder, the limit), when there is one. */
  amount: number | null;
}

/** A value as hundredths, or null when it is not a finite number with at most two decimals. */
export function toHundredths(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const scaled = value * SCALE;
  const rounded = Math.round(scaled);
  return Math.abs(scaled - rounded) < 1e-6 ? rounded : null;
}

const fromHundredths = (value: number): number => value / SCALE;

/** "Instagram Verification" → "instagram_verification". */
export function slugKey(name: string): string {
  return name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '_')
    .replaceAll(/^_+|_+$/g, '')
    .slice(0, QUALITY_LIMITS.key);
}

const KEY_RULE = /^[a-z0-9][a-z0-9_]{0,39}$/;

/** A key that is not taken yet: the slug, then slug_2, slug_3… */
function freeKey(base: string, taken: Set<string>): string {
  const root = base || 'item';
  let candidate = root;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${root.slice(0, QUALITY_LIMITS.key - 4)}_${n}`;
  taken.add(candidate);
  return candidate;
}

/** Blank keys filled from the names (stable keys are what evidence is stored against); given keys are kept. */
export function withKeys(body: QualityConfigBody): QualityConfigBody {
  const criterionKeys = new Set(body.criteria.map((c) => c.key).filter(Boolean));
  const bandKeys = new Set(body.bands.map((b) => b.key).filter(Boolean));
  return {
    ...body,
    criteria: body.criteria.map((criterion) => {
      const subKeys = new Set(criterion.sub_criteria.map((s) => s.key).filter(Boolean));
      return {
        ...criterion,
        key: criterion.key || freeKey(slugKey(criterion.name), criterionKeys),
        sub_criteria: criterion.sub_criteria.map((sub) => ({ ...sub, key: sub.key || freeKey(slugKey(sub.name), subKeys) })),
      };
    }),
    bands: body.bands.map((band) => ({ ...band, key: band.key || freeKey(slugKey(band.label), bandKeys) })),
  };
}

const issue = (path: string, code: QualityIssueCode, message: string, amount: number | null = null): QualityIssue => ({
  path,
  code,
  message,
  amount,
});

/** A 0-100 value with at most two decimals, as hundredths; pushes the problem when it is not one. */
function checkedAmount(value: unknown, path: string, label: string, max: number, issues: QualityIssue[]): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    issues.push(issue(path, 'NOT_A_NUMBER', `${label} must be a number.`));
    return null;
  }
  const hundredths = toHundredths(value);
  if (hundredths === null) {
    issues.push(issue(path, 'TOO_MANY_DECIMALS', `${label} can have at most two decimals.`));
    return null;
  }
  if (hundredths < 0 || hundredths > max) {
    issues.push(issue(path, 'OUT_OF_RANGE', `${label} must be between 0 and ${fromHundredths(max)}.`, fromHundredths(max)));
    return null;
  }
  return hundredths;
}

function checkName(name: unknown, path: string, issues: QualityIssue[]): void {
  const text = typeof name === 'string' ? name.trim() : '';
  if (!text) issues.push(issue(path, 'NAME_REQUIRED', 'Enter a name.'));
  else if (text.length > QUALITY_LIMITS.name) {
    issues.push(issue(path, 'NAME_TOO_LONG', `Keep names under ${QUALITY_LIMITS.name} characters.`, QUALITY_LIMITS.name));
  }
}

function checkKey(key: string, path: string, seen: Set<string>, issues: QualityIssue[]): void {
  if (!KEY_RULE.test(key)) {
    issues.push(issue(path, 'KEY_INVALID', 'Keys use lowercase letters, digits and underscores, up to 40 characters.'));
  } else if (seen.has(key)) {
    issues.push(issue(path, 'KEY_DUPLICATE', `The key "${key}" is used twice.`));
  }
  seen.add(key);
}

function checkAutoCheck(item: { auto_check: AutoCheck; threshold: number | null }, path: string, issues: QualityIssue[]): void {
  if (!AUTO_CHECKS.includes(item.auto_check)) {
    issues.push(issue(`${path}.auto_check`, 'AUTO_CHECK_INVALID', 'Pick one of the listed automatic checks.'));
    return;
  }
  const needsThreshold = THRESHOLD_CHECKS.includes(item.auto_check);
  const threshold = item.threshold;
  if (needsThreshold && (threshold === null || !Number.isInteger(threshold) || threshold < 1 || threshold > MAX_THRESHOLD)) {
    issues.push(issue(`${path}.threshold`, 'THRESHOLD_REQUIRED', `This check needs a whole-number threshold from 1 to ${MAX_THRESHOLD}.`, MAX_THRESHOLD));
  } else if (!needsThreshold && threshold !== null) {
    issues.push(issue(`${path}.threshold`, 'THRESHOLD_UNUSED', 'Only the follower, recent-post and review checks take a threshold.'));
  }
}

/** The sub-criteria's points against the parent's weightage. */
function checkSubCriteria(criterion: QualityCriterion, path: string, weight: number | null, mode: QualityValidationMode, issues: QualityIssue[]): void {
  const subs = criterion.sub_criteria;
  if (subs.length > QUALITY_LIMITS.subCriteria) {
    issues.push(issue(`${path}.sub_criteria`, 'TOO_MANY', `A criterion can have at most ${QUALITY_LIMITS.subCriteria} sub-criteria.`, QUALITY_LIMITS.subCriteria));
  }
  if (subs.length > 0 && criterion.auto_check !== 'NONE') {
    issues.push(issue(`${path}.auto_check`, 'PARENT_AUTO_CHECK', 'A criterion with sub-criteria is checked through its sub-criteria; set the check on them.'));
  }
  const keys = new Set<string>();
  let sum = 0;
  let readable = true;
  subs.forEach((sub, index) => {
    const subPath = `${path}.sub_criteria.${index}`;
    checkName(sub.name, `${subPath}.name`, issues);
    checkKey(sub.key, `${subPath}.key`, keys, issues);
    checkAutoCheck(sub, subPath, issues);
    const points = checkedAmount(sub.points, `${subPath}.points`, 'Points', MAX_TOTAL, issues);
    if (points === null) readable = false;
    else sum += points;
  });
  if (subs.length === 0 || weight === null || !readable) return;
  if (sum > weight) {
    issues.push(issue(`${path}.sub_criteria`, 'SUB_SUM_OVER', `Sub-criteria add up to ${fromHundredths(sum)}, more than the ${fromHundredths(weight)} this criterion is worth.`, fromHundredths(sum - weight)));
  } else if (mode === 'PUBLISH' && sum !== weight) {
    issues.push(issue(`${path}.sub_criteria`, 'SUB_SUM_MISMATCH', `Sub-criteria add up to ${fromHundredths(sum)}; give out the remaining ${fromHundredths(weight - sum)} points.`, fromHundredths(weight - sum)));
  }
}

/** One criterion's own fields and its sub-criteria; returns its weightage in hundredths when readable. */
function checkCriterion(criterion: QualityCriterion, index: number, keys: Set<string>, mode: QualityValidationMode, issues: QualityIssue[]): number | null {
  const path = `criteria.${index}`;
  checkName(criterion.name, `${path}.name`, issues);
  checkKey(criterion.key, `${path}.key`, keys, issues);
  if (criterion.sub_criteria.length === 0) checkAutoCheck(criterion, path, issues);
  const weight = checkedAmount(criterion.weightage, `${path}.weightage`, 'Weightage', MAX_TOTAL, issues);
  checkSubCriteria(criterion, path, weight, mode, issues);
  return weight;
}

function checkBands(bands: QualityBand[], issues: QualityIssue[]): void {
  if (bands.length > QUALITY_LIMITS.bands) {
    issues.push(issue('bands', 'TOO_MANY', `Use at most ${QUALITY_LIMITS.bands} classification bands.`, QUALITY_LIMITS.bands));
  }
  const keys = new Set<string>();
  const mins = new Set<number>();
  bands.forEach((band, index) => {
    const path = `bands.${index}`;
    checkName(band.label, `${path}.label`, issues);
    checkKey(band.key, `${path}.key`, keys, issues);
    if (!BAND_TONES.includes(band.tone)) issues.push(issue(`${path}.tone`, 'BAND_TONE_INVALID', 'Pick green, yellow or red.'));
    const min = checkedAmount(band.min, `${path}.min`, 'The band start', MAX_TOTAL, issues);
    if (min !== null && mins.has(min)) issues.push(issue(`${path}.min`, 'KEY_DUPLICATE', `Two bands start at ${fromHundredths(min)}.`));
    if (min !== null) mins.add(min);
  });
  if (!mins.has(0)) issues.push(issue('bands', 'BAND_ZERO_MISSING', 'One band must start at 0 so every score has a classification.'));
}

/** The enabled criteria's weightage, in percent (two decimals). */
export function weightageTotal(criteria: readonly QualityCriterion[]): number {
  return fromHundredths(criteria.filter((c) => c.enabled).reduce((sum, c) => sum + (toHundredths(c.weightage) ?? 0), 0));
}

/**
 * Everything wrong with a configuration. A draft may still be short of 100%
 * (it is being built); nothing may ever go over 100%, and publishing needs
 * exactly 100% with every criterion's sub-criteria adding up to it.
 */
export function validateQualityConfig(body: QualityConfigBody, mode: QualityValidationMode): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (body.criteria.length > QUALITY_LIMITS.criteria) {
    issues.push(issue('criteria', 'TOO_MANY', `Use at most ${QUALITY_LIMITS.criteria} criteria.`, QUALITY_LIMITS.criteria));
  }
  const keys = new Set<string>();
  let total = 0;
  let readable = true;
  body.criteria.forEach((criterion, index) => {
    const weight = checkCriterion(criterion, index, keys, mode, issues);
    if (weight === null) readable = false;
    else if (criterion.enabled) total += weight;
  });
  if (mode === 'PUBLISH' && !body.criteria.some((c) => c.enabled)) {
    issues.push(issue('criteria', 'NO_CRITERIA', 'Enable at least one criterion before publishing.'));
  }
  if (readable && total > MAX_TOTAL) {
    issues.push(issue('criteria', 'TOTAL_OVER', 'Weightage cannot exceed 100%.', fromHundredths(total - MAX_TOTAL)));
  } else if (readable && mode === 'PUBLISH' && total < MAX_TOTAL) {
    issues.push(issue('criteria', 'TOTAL_UNDER', `Allocate the remaining ${fromHundredths(MAX_TOTAL - total)}% before publishing.`, fromHundredths(MAX_TOTAL - total)));
  }
  if (body.min_qualification_score !== null) {
    checkedAmount(body.min_qualification_score, 'min_qualification_score', 'The minimum qualifying score', MAX_TOTAL, issues);
  }
  checkBands(body.bands, issues);
  return issues;
}

// ---- Scoring ----

/** One thing evidence is recorded against: a sub-criterion, or a criterion that has none. */
export interface QualityItem {
  key: string;
  criterion_key: string;
  sub_key: string | null;
  name: string;
  /** Hundredths. */
  points: number;
  mandatory: boolean;
  auto_check: AutoCheck;
  threshold: number | null;
  guidance: string;
}

export function qualityItems(criterion: QualityCriterion): QualityItem[] {
  if (criterion.sub_criteria.length === 0) {
    return [
      {
        key: criterion.key,
        criterion_key: criterion.key,
        sub_key: null,
        name: criterion.name,
        points: toHundredths(criterion.weightage) ?? 0,
        // The criterion's own gate already covers its single item.
        mandatory: false,
        auto_check: criterion.auto_check,
        threshold: criterion.threshold,
        guidance: criterion.guidance,
      },
    ];
  }
  return criterion.sub_criteria.map((sub) => ({
    key: `${criterion.key}.${sub.key}`,
    criterion_key: criterion.key,
    sub_key: sub.key,
    name: sub.name,
    points: toHundredths(sub.points) ?? 0,
    mandatory: sub.mandatory,
    auto_check: sub.auto_check,
    threshold: sub.threshold,
    guidance: sub.guidance,
  }));
}

/** Every item of the enabled criteria, in display order. */
export function enabledItems(body: QualityConfigBody): QualityItem[] {
  return body.criteria.filter((c) => c.enabled).flatMap(qualityItems);
}

export type CriterionStatus = 'VERIFIED' | 'PARTIAL' | 'PENDING' | 'FAILED';
export type GateState = 'PASSED' | 'FAILED' | 'PENDING';
export type Qualification = 'QUALIFIED' | 'NOT_QUALIFIED' | 'PENDING_VERIFICATION';
export type VerificationProgress = 'COMPLETE' | 'IN_PROGRESS' | 'PENDING';

export interface QualityItemResult {
  key: string;
  criterion_key: string;
  sub_key: string | null;
  name: string;
  points: number;
  earned: number;
  status: EvidenceStatus;
  mandatory: boolean;
  auto_check: AutoCheck;
  threshold: number | null;
  guidance: string;
}

export interface QualityCriterionResult {
  key: string;
  name: string;
  max: number;
  earned: number;
  status: CriterionStatus;
  mandatory: boolean;
  items: QualityItemResult[];
}

export interface QualityGateResult {
  key: string;
  name: string;
  state: GateState;
}

export interface QualityResult {
  score: number;
  max_score: number;
  classification: string;
  classification_label: string;
  tone: BandTone;
  qualification: Qualification;
  verification: VerificationProgress;
  min_qualification_score: number | null;
  /** The score if every pending item were verified. */
  potential_score: number;
  gates: QualityGateResult[];
  verified_items: number;
  pending_items: number;
  failed_items: number;
  criteria: QualityCriterionResult[];
}

export type EvidenceStatuses = Readonly<Record<string, EvidenceStatus | undefined>>;

function criterionStatus(items: readonly QualityItemResult[]): CriterionStatus {
  const verified = items.filter((i) => i.status === 'VERIFIED').length;
  if (verified === items.length) return 'VERIFIED';
  if (verified > 0) return 'PARTIAL';
  return items.some((i) => i.status === 'PENDING') ? 'PENDING' : 'FAILED';
}

/** A criterion gate passes on any verified item and fails only when every item failed. */
function criterionGate(items: readonly QualityItemResult[]): GateState {
  if (items.some((i) => i.status === 'VERIFIED')) return 'PASSED';
  return items.every((i) => i.status === 'FAILED') ? 'FAILED' : 'PENDING';
}

const ITEM_GATE: Record<EvidenceStatus, GateState> = { VERIFIED: 'PASSED', FAILED: 'FAILED', PENDING: 'PENDING' };

/** The band a score falls in: the one with the highest start at or below it. */
export function classify(score: number, bands: readonly QualityBand[]): QualityBand | null {
  return [...bands].sort((a, b) => b.min - a.min).find((band) => band.min <= score) ?? null;
}

function qualificationOf(gates: readonly QualityGateResult[], earned: number, potential: number, min: number | null): Qualification {
  const gatesPassed = gates.every((g) => g.state === 'PASSED');
  if (gatesPassed && (min === null || earned >= min)) return 'QUALIFIED';
  const cannotReach = min !== null && potential < min;
  if (gates.some((g) => g.state === 'FAILED') || cannotReach) return 'NOT_QUALIFIED';
  return 'PENDING_VERIFICATION';
}

function verificationOf(verified: number, failed: number, pending: number): VerificationProgress {
  if (verified + failed + pending === 0 || verified + failed === 0) return 'PENDING';
  return pending === 0 ? 'COMPLETE' : 'IN_PROGRESS';
}

/** Running totals while a lead is scored, in hundredths. */
interface ScoreTally {
  earned: number;
  max: number;
  pending: number;
  counts: Record<EvidenceStatus, number>;
  gates: QualityGateResult[];
}

/** One criterion's result; adds its points, item counts and gates (criterion gate first) to the tally. */
function scoreCriterion(criterion: QualityCriterion, statuses: EvidenceStatuses, tally: ScoreTally): QualityCriterionResult {
  const itemGates: QualityGateResult[] = [];
  const items = qualityItems(criterion).map((item): QualityItemResult => {
    const status = statuses[item.key] ?? 'PENDING';
    tally.counts[status] += 1;
    if (status === 'PENDING') tally.pending += item.points;
    if (item.mandatory) itemGates.push({ key: item.key, name: `${criterion.name} › ${item.name}`, state: ITEM_GATE[status] });
    return { ...item, earned: status === 'VERIFIED' ? item.points : 0, status };
  });
  if (criterion.mandatory) tally.gates.push({ key: criterion.key, name: criterion.name, state: criterionGate(items) });
  tally.gates.push(...itemGates);
  const earned = items.reduce((sum, item) => sum + item.earned, 0);
  const max = items.reduce((sum, item) => sum + item.points, 0);
  tally.earned += earned;
  tally.max += max;
  return {
    key: criterion.key,
    name: criterion.name,
    max: fromHundredths(max),
    earned: fromHundredths(earned),
    status: criterionStatus(items),
    mandatory: criterion.mandatory,
    items: items.map((item) => ({ ...item, points: fromHundredths(item.points), earned: fromHundredths(item.earned) })),
  };
}

/**
 * A lead's score from the published configuration and the status of each
 * item. Only VERIFIED items earn points; anything without a status is PENDING.
 * Throws when the configuration would let a score pass 100 — a published
 * configuration never does, so that is a bug, never a lead to save.
 */
export function scoreLead(body: QualityConfigBody, statuses: EvidenceStatuses): QualityResult {
  const tally: ScoreTally = { earned: 0, max: 0, pending: 0, counts: { VERIFIED: 0, PENDING: 0, FAILED: 0 }, gates: [] };
  const criteria = body.criteria.filter((c) => c.enabled).map((criterion) => scoreCriterion(criterion, statuses, tally));
  const { earned, pending: pendingPoints, counts, gates } = tally;
  if (tally.max > MAX_TOTAL) {
    throw new RangeError('This scoring configuration lets a score pass 100; publish a valid configuration first.');
  }
  const score = fromHundredths(earned);
  const band = classify(score, body.bands);
  const min = body.min_qualification_score;
  return {
    score,
    max_score: QUALITY_MAX_SCORE,
    classification: band?.key ?? '',
    classification_label: band?.label ?? '',
    tone: band?.tone ?? 'error',
    qualification: qualificationOf(gates, earned, earned + pendingPoints, min === null ? null : toHundredths(min)),
    verification: verificationOf(counts.VERIFIED, counts.FAILED, counts.PENDING),
    min_qualification_score: min,
    potential_score: fromHundredths(earned + pendingPoints),
    gates,
    verified_items: counts.VERIFIED,
    pending_items: counts.PENDING,
    failed_items: counts.FAILED,
    criteria,
  };
}
