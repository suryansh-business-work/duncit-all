import type { FieldPath } from 'react-hook-form';
import {
  validateQualityConfig,
  withKeys,
  type QualityIssue,
  type QualityIssueCode,
  type QualityValidationMode,
} from '../../lib/generated/lead-quality-rules';
import { toConfigBody } from './lead-quality-config.convert';
import type { LeadQualityConfigFormValues } from './lead-quality-config.schema';
import type { Translate } from './lead-quality-config.types';

/**
 * Where a scoring-model issue goes on the form, and what it says. The same
 * issues come from the live check (the generated rules) and from the server's
 * `BAD_USER_INPUT` refusal (`extensions.issues`), so both read through here.
 */

/** An issue as either source reports it (the server's `amount` may be absent). */
export interface IssueLike {
  path: string;
  code: string;
  message: string;
  amount?: number | null;
}

/** Copy per issue code — literal keys, so the localization gate sees each one. */
const ISSUE_KEY: Record<QualityIssueCode, string> = {
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
const ISSUE_KEY_BY_CODE: Readonly<Record<string, string | undefined>> = ISSUE_KEY;

/** Lists whose own problems (a total, a count, a missing band) sit on the list rather than a field. */
const LIST_SEGMENTS = new Set(['criteria', 'sub_criteria', 'bands']);

/** The fields an issue can point at directly. */
const LEAF_SEGMENTS = new Set(['name', 'label', 'weightage', 'points', 'auto_check', 'threshold', 'min', 'tone', 'min_qualification_score']);

/**
 * The form field name for an issue path. Keys are hidden and made from names,
 * so a key problem shows on the name (a band's on its label); a list's problem
 * goes on the list's `root`.
 */
export function formFieldName(path: string): string {
  const segments = path.split('.');
  const last = segments.at(-1) ?? '';
  if (last === 'key') segments.splice(-1, 1, segments[0] === 'bands' ? 'label' : 'name');
  else if (LIST_SEGMENTS.has(last)) segments.push('root');
  return segments.join('.');
}

/** The same name as a path for a Zod issue (list positions as numbers). */
export function formPath(path: string): (string | number)[] {
  return formFieldName(path)
    .split('.')
    .map((segment) => (segment !== '' && Number.isInteger(Number(segment)) ? Number(segment) : segment));
}

/** True for a name that is one field of the form (never a list's root). */
export function isLeafPath(name: string): name is FieldPath<LeadQualityConfigFormValues> {
  return LEAF_SEGMENTS.has(name.split('.').at(-1) ?? '');
}

/** An issue in the reader's language; a code this build does not know falls back to the server's own sentence. */
export function issueMessage(t: Translate, issue: IssueLike): string {
  // KEY_DUPLICATE also reports two bands starting at the same score.
  if (issue.code === 'KEY_DUPLICATE' && issue.path.endsWith('.min')) return t('crm.leadQualitySettings.issue.bandStartDuplicate');
  const key = ISSUE_KEY_BY_CODE[issue.code];
  return key ? t(key, { vars: { amount: issue.amount ?? '' } }) : issue.message;
}

/** Everything the publish rules find in the current values (a superset of what a draft save refuses). */
export function liveIssues(values: LeadQualityConfigFormValues, mode: QualityValidationMode = 'PUBLISH'): QualityIssue[] {
  return validateQualityConfig(withKeys(toConfigBody(values)), mode);
}

/** The issues reported on exactly this path. */
export const issuesAt = (issues: readonly QualityIssue[], path: string): QualityIssue[] => issues.filter((issue) => issue.path === path);

/** Whether anything at or inside this path has a problem. */
export const hasIssueWithin = (issues: readonly QualityIssue[], path: string): boolean =>
  issues.some((issue) => issue.path === path || issue.path.startsWith(`${path}.`));
