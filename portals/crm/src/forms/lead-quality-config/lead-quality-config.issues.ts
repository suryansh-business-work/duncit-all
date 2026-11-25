import type { FieldPath } from 'react-hook-form';
import {
  isLeadQualityLeaf,
  leadQualityFieldName,
  leadQualityFormPath,
  leadQualityHasIssueWithin,
  leadQualityIssueMessage,
  leadQualityIssuesAt,
  type LeadQualityIssueLike,
} from '@duncit/forms/schemas';
import type { QualityIssue, QualityValidationMode } from '../../lib/generated/lead-quality-rules';
import { LEAD_QUALITY_EDITOR, type LeadQualityConfigFormValues } from './lead-quality-config.schema';

/**
 * Where a scoring-model issue goes on the form, and what it says (shared with
 * the Duncit CRM app in `@duncit/forms/schemas`). The same issues come from
 * the live check (the generated rules) and from the server's `BAD_USER_INPUT`
 * refusal (`extensions.issues`), so both read through here.
 */

/** An issue as either source reports it (the server's `amount` may be absent). */
export type IssueLike = LeadQualityIssueLike;

export const formFieldName = leadQualityFieldName;
export const formPath = leadQualityFormPath;
export const issueMessage = leadQualityIssueMessage;

/** True for a name that is one field of the form (never a list's root). */
export function isLeafPath(name: string): name is FieldPath<LeadQualityConfigFormValues> {
  return isLeadQualityLeaf(name);
}

/** Everything the publish rules find in the current values (a superset of what a draft save refuses). */
export const liveIssues = (values: LeadQualityConfigFormValues, mode: QualityValidationMode = 'PUBLISH'): QualityIssue[] =>
  LEAD_QUALITY_EDITOR.liveIssues(values, mode);

/** The issues reported on exactly this path. */
export const issuesAt = leadQualityIssuesAt;

/** Whether anything at or inside this path has a problem. */
export const hasIssueWithin = leadQualityHasIssueWithin;
