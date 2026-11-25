import type { LeadEvidenceValues } from '@duncit/forms/schemas';

/**
 * The evidence decision's rules live in @duncit/forms/schemas, shared with the
 * Duncit CRM Android app; re-exported here under the names the portal imports.
 */
export {
  LEAD_EVIDENCE_MIN,
  LEAD_EVIDENCE_STATUSES,
  LEAD_EVIDENCE_TEXT_MAX,
  LEAD_EVIDENCE_URL_MAX,
  leadEvidenceDecision,
  leadEvidenceDefaults,
  makeLeadEvidenceSchema as leadEvidenceSchema,
} from '@duncit/forms/schemas';

export type LeadEvidenceFormValues = LeadEvidenceValues;
