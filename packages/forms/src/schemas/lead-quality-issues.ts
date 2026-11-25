import type { Translate } from './translate';

/**
 * Where a Lead Quality Score configuration problem goes on the settings form,
 * and what it says. The same problems come from the live check (each client's
 * generated copy of the server rules) and from the server's `BAD_USER_INPUT`
 * refusal (`extensions.issues`), so both read through here. Shared by the CRM
 * portal and the Duncit CRM app.
 */

/** A problem as either source reports it (the server's `amount` may be absent). */
export interface LeadQualityIssueLike {
  path: string;
  code: string;
  message: string;
  amount?: number | null;
}

/** Copy per issue code — literal keys, so the localization gate sees each one. */
const ISSUE_KEY: Readonly<Record<string, string | undefined>> = {
  NO_CRITERIA: 'crm.leadQualitySettings.issue.noCriteria',
  TOO_MANY: 'crm.leadQualitySettings.issue.tooMany',
  NAME_REQUIRED: 'crm.leadQualitySettings.issue.nameRequired',
  NAME_TOO_LONG: 'crm.leadQualitySettings.issue.nameTooLong',
  KEY_INVALID: 'crm.leadQualitySettings.issue.keyInvalid',
  KEY_DUPLICATE: 'crm.leadQualitySettings.issue.keyDuplicate',
  NOT_A_NUMBER: 'crm.leadQualitySettings.issue.notANumber',
  TOO_MANY_DECIMALS: 'crm.leadQualitySettings.issue.tooManyDecimals',
  OUT_OF_RANGE: 'crm.leadQualitySettings.issue.outOfRange',
  SUB_SUM_OVER: 'crm.leadQualitySettings.issue.subSumOver',
  SUB_SUM_MISMATCH: 'crm.leadQualitySettings.issue.subSumMismatch',
  TOTAL_OVER: 'crm.leadQualitySettings.issue.totalOver',
  TOTAL_UNDER: 'crm.leadQualitySettings.issue.totalUnder',
  AUTO_CHECK_INVALID: 'crm.leadQualitySettings.issue.autoCheckInvalid',
  PARENT_AUTO_CHECK: 'crm.leadQualitySettings.issue.parentAutoCheck',
  THRESHOLD_REQUIRED: 'crm.leadQualitySettings.issue.thresholdRequired',
  THRESHOLD_UNUSED: 'crm.leadQualitySettings.issue.thresholdUnused',
  BAND_ZERO_MISSING: 'crm.leadQualitySettings.issue.bandZeroMissing',
  BAND_TONE_INVALID: 'crm.leadQualitySettings.issue.bandToneInvalid',
};

/** Lists whose own problems (a total, a count, a missing band) sit on the list rather than a field. */
const LIST_SEGMENTS = new Set(['criteria', 'sub_criteria', 'bands']);

/** The fields a problem can point at directly. */
const LEAF_SEGMENTS = new Set(['name', 'label', 'weightage', 'points', 'auto_check', 'threshold', 'min', 'tone', 'min_qualification_score']);

const lastSegment = (path: string): string => path.slice(path.lastIndexOf('.') + 1);

/**
 * The form field name for a problem's path. Keys are hidden and made from the
 * names, so a key problem shows on the name (a band's on its label); a list's
 * problem goes on the list's `root`.
 */
export function leadQualityFieldName(path: string): string {
  const segments = path.split('.');
  const last = lastSegment(path);
  if (last === 'key') segments.splice(-1, 1, segments[0] === 'bands' ? 'label' : 'name');
  else if (LIST_SEGMENTS.has(last)) segments.push('root');
  return segments.join('.');
}

/** The same name as a Zod issue path (list positions as numbers). */
export function leadQualityFormPath(path: string): (string | number)[] {
  return leadQualityFieldName(path)
    .split('.')
    .map((segment) => (String(Number(segment)) === segment ? Number(segment) : segment));
}

/** True for a name that is one field of the form (never a list's root). */
export const isLeadQualityLeaf = (name: string): boolean => LEAF_SEGMENTS.has(lastSegment(name));

/** A problem in the reader's language; a code this build does not know falls back to the server's own sentence. */
export function leadQualityIssueMessage(t: Translate, issue: LeadQualityIssueLike): string {
  // KEY_DUPLICATE also reports two bands starting at the same score.
  if (issue.code === 'KEY_DUPLICATE' && issue.path.endsWith('.min')) return t('crm.leadQualitySettings.issue.bandStartDuplicate');
  const key = ISSUE_KEY[issue.code];
  return key ? t(key, { vars: { amount: issue.amount ?? '' } }) : issue.message;
}

/** The problems reported on exactly this path. */
export const leadQualityIssuesAt = <I extends LeadQualityIssueLike>(issues: readonly I[], path: string): I[] =>
  issues.filter((issue) => issue.path === path);

/** Whether anything at or inside this path has a problem. */
export const leadQualityHasIssueWithin = (issues: readonly LeadQualityIssueLike[], path: string): boolean =>
  issues.some((issue) => issue.path === path || issue.path.startsWith(`${path}.`));

/** What a refused settings write means for the page. */
export interface LeadQualityFailure {
  /** Someone else saved or published after this editor loaded (`CONFLICT`): only a reload helps. */
  conflict: boolean;
  /** The configuration problems a `BAD_USER_INPUT` refusal listed, for the form's fields. */
  issues: LeadQualityIssueLike[];
  /** The server's sentence, for anything else. */
  message: string;
}

function isIssue(value: unknown): value is LeadQualityIssueLike {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof value.path === 'string' &&
    'code' in value &&
    typeof value.code === 'string' &&
    'message' in value &&
    typeof value.message === 'string'
  );
}

/**
 * Reads a refused save, publish, discard or restore from its GraphQL error
 * `extensions` (each client reads those its own way) and its worded message.
 */
export function leadQualityFailure(extensions: Readonly<Record<string, unknown>> | null | undefined, message: string): LeadQualityFailure {
  const read = extensions ?? {};
  const listed = read.code === 'BAD_USER_INPUT' ? read.issues : undefined;
  return { conflict: read.code === 'CONFLICT', issues: Array.isArray(listed) ? listed.filter(isIssue) : [], message };
}
