import { z } from 'zod';
import type { CrmLeadEvidenceDecisionInput, CrmLeadEvidenceStatus } from '@duncit/gql-types';
import { isWebUrl } from '../validation/socialLinks';
import type { Translate } from './lead-evidence.types';

/** The server's limits (leadQuality.service.ts checkDecisions / cleanText / cleanUrl), so a decision that passes here saves. */
export const LEAD_EVIDENCE_MIN = 3;
export const LEAD_EVIDENCE_TEXT_MAX = 1000;
export const LEAD_EVIDENCE_URL_MAX = 500;

/** Verified earns the item's points, Failed is checked and not met, Pending clears an earlier decision. */
export const LEAD_EVIDENCE_STATUSES = ['VERIFIED', 'FAILED', 'PENDING'] as const satisfies readonly CrmLeadEvidenceStatus[];

/**
 * One evidence decision. Verified needs what proves it and Failed needs why,
 * both 3-1000 characters; the source link is optional but must be http(s).
 * Clearing a decision needs nothing, so a half-typed hidden field never blocks it.
 */
export const leadEvidenceSchema = (t: Translate) =>
  z
    .object({
      status: z.enum(LEAD_EVIDENCE_STATUSES),
      evidence: z.string().trim(),
      source_url: z.string().trim(),
      notes: z.string().trim(),
    })
    .superRefine((values, ctx) => {
      if (values.status === 'PENDING') return;
      const tooLong = (path: 'evidence' | 'source_url' | 'notes', max: number) =>
        ctx.addIssue({ code: 'custom', path: [path], message: t('crm.leadQualityTab.textTooLong', { vars: { max } }) });
      if (values.evidence.length < LEAD_EVIDENCE_MIN) {
        const message =
          values.status === 'VERIFIED'
            ? t('crm.leadQualityTab.evidenceRequired', { vars: { min: LEAD_EVIDENCE_MIN } })
            : t('crm.leadQualityTab.reasonRequired', { vars: { min: LEAD_EVIDENCE_MIN } });
        ctx.addIssue({ code: 'custom', path: ['evidence'], message });
      } else if (values.evidence.length > LEAD_EVIDENCE_TEXT_MAX) {
        tooLong('evidence', LEAD_EVIDENCE_TEXT_MAX);
      }
      if (values.source_url.length > LEAD_EVIDENCE_URL_MAX) {
        tooLong('source_url', LEAD_EVIDENCE_URL_MAX);
      } else if (values.source_url && !isWebUrl(values.source_url)) {
        ctx.addIssue({ code: 'custom', path: ['source_url'], message: t('crm.leadQualityTab.sourceInvalid') });
      }
      if (values.notes.length > LEAD_EVIDENCE_TEXT_MAX) tooLong('notes', LEAD_EVIDENCE_TEXT_MAX);
    });

export type LeadEvidenceFormValues = z.infer<ReturnType<typeof leadEvidenceSchema>>;

interface RecordedEvidence {
  status: CrmLeadEvidenceStatus;
  evidence: string;
  source_url: string;
  notes: string;
}

/** The form's starting values: the recorded decision, or a fresh Verified one. */
export const leadEvidenceDefaults = (recorded?: RecordedEvidence | null): LeadEvidenceFormValues => ({
  status: recorded && recorded.status !== 'PENDING' ? recorded.status : 'VERIFIED',
  evidence: recorded?.evidence ?? '',
  source_url: recorded?.source_url ?? '',
  notes: recorded?.notes ?? '',
});

/** The decision the API takes. Clearing sends only the item and PENDING; empty optional fields are left out. */
export function leadEvidenceDecision(itemKey: string, values: LeadEvidenceFormValues): CrmLeadEvidenceDecisionInput {
  if (values.status === 'PENDING') return { item_key: itemKey, status: 'PENDING' };
  return {
    item_key: itemKey,
    status: values.status,
    evidence: values.evidence.trim(),
    source_url: values.source_url.trim() || null,
    notes: values.notes.trim() || null,
  };
}
