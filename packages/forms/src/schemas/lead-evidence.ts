import { z } from 'zod';

import { isWebUrl } from './crm-leads';
import type { Translate } from './translate';

/**
 * Lead Quality Score → record one item's evidence. Shared by the CRM portal's
 * evidence dialog and the Duncit CRM app's, so both refuse the same decision
 * with the same sentence — and a decision that passes here saves (the limits
 * are the server's: leadQuality.service.ts checkDecisions / cleanText / cleanUrl).
 */
export const LEAD_EVIDENCE_MIN = 3;
export const LEAD_EVIDENCE_TEXT_MAX = 1000;
export const LEAD_EVIDENCE_URL_MAX = 500;

/** Verified earns the item's points, Failed is checked and not met, Pending clears an earlier decision. */
export const LEAD_EVIDENCE_STATUSES = ['VERIFIED', 'FAILED', 'PENDING'] as const;

export type LeadEvidenceStatus = (typeof LEAD_EVIDENCE_STATUSES)[number];

/**
 * One evidence decision. Verified needs what proves it and Failed needs why,
 * both 3-1000 characters; the source link is optional but must be http(s).
 * Clearing a decision needs nothing, so a half-typed hidden field never blocks it.
 */
export const makeLeadEvidenceSchema = (t: Translate) =>
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

export type LeadEvidenceValues = z.infer<ReturnType<typeof makeLeadEvidenceSchema>>;

/** A decision already recorded on the item (CrmLeadEvidence). */
export interface RecordedLeadEvidence {
  status: LeadEvidenceStatus;
  evidence: string;
  source_url: string;
  notes: string;
}

/** The decision the API takes (CrmLeadEvidenceDecisionInput). */
export interface LeadEvidenceDecision {
  item_key: string;
  status: LeadEvidenceStatus;
  evidence?: string;
  source_url?: string | null;
  notes?: string | null;
}

/** The form's starting values: the recorded decision, or a fresh Verified one. */
export const leadEvidenceDefaults = (recorded?: RecordedLeadEvidence | null): LeadEvidenceValues => ({
  status: recorded && recorded.status !== 'PENDING' ? recorded.status : 'VERIFIED',
  evidence: recorded?.evidence ?? '',
  source_url: recorded?.source_url ?? '',
  notes: recorded?.notes ?? '',
});

/** The decision to send. Clearing sends only the item and PENDING; empty optional fields are left out. */
export function leadEvidenceDecision(itemKey: string, values: LeadEvidenceValues): LeadEvidenceDecision {
  if (values.status === 'PENDING') return { item_key: itemKey, status: 'PENDING' };
  return {
    item_key: itemKey,
    status: values.status,
    evidence: values.evidence.trim(),
    source_url: values.source_url.trim() || null,
    notes: values.notes.trim() || null,
  };
}
