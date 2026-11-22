import { parse } from 'graphql';
import { z } from 'zod';
import { defineTool } from '../define';
import { assertTarget, CRM_LISTING, DATA_RULE, evidenceDecisionSchema, leadTarget, leadTypeSchema, NO_INVENTION, runCrm } from './lead-tools.shared';

/**
 * Scoring tools: record verified evidence on a lead or a candidate, rescore
 * one (optionally running the Instagram / Google Maps / website checks), and
 * rescore many in the background. Scores only ever move through evidence.
 */

const SCORE_RESPONSE = `
  skipped_checks
  details {
    entity_type
    lead_id
    lead_name
    stale
    result {
      score
      classification_label
      qualification
      verification
      potential_score
      pending_items
      gates {
        name
        state
      }
      criteria {
        key
        name
        max
        earned
        status
      }
    }
  }
`;

const CANDIDATE_RESPONSE = `
  id
  name
  status
  score
  qualification
  classification_label
  missing_evidence
  skipped_checks
  result {
    gates {
      name
      state
    }
    criteria {
      key
      name
      max
      earned
      status
    }
  }
`;

export const RECORD_EVIDENCE = parse(
  `mutation McpRecordLeadEvidence($entity_type: CrmEntityType!, $lead_id: ID!, $decisions: [CrmLeadEvidenceDecisionInput!]!) { recordCrmLeadEvidence(entity_type: $entity_type, lead_id: $lead_id, decisions: $decisions) { ${SCORE_RESPONSE} } }`
);
export const VERIFY_CANDIDATE = parse(
  `mutation McpVerifyCandidateEvidence($id: ID!, $decisions: [CrmLeadEvidenceDecisionInput!]!, $external_checks: Boolean) { verifyCrmLeadCandidateEvidence(id: $id, decisions: $decisions, external_checks: $external_checks) { ${CANDIDATE_RESPONSE} } }`
);
export const RECALCULATE_ONE = parse(
  `mutation McpRecalculateLeadQuality($entity_type: CrmEntityType!, $lead_id: ID!, $external: Boolean) { recalculateCrmLeadQuality(entity_type: $entity_type, lead_id: $lead_id, external: $external) { ${SCORE_RESPONSE} } }`
);
export const RECALCULATE_MANY = parse(
  `mutation McpRecalculateLeadScores($entity_type: CrmEntityType!, $lead_ids: [ID!], $external: Boolean) { recalculateCrmLeadQualityScores(entity_type: $entity_type, lead_ids: $lead_ids, external: $external) { job_id total } }`
);

export const verifyLeadEvidenceTool = defineTool({
  name: 'verify_lead_evidence',
  title: 'Verify lead evidence',
  description: [
    '[CRM · Writes data] Records what you verified about a lead or candidate against its Lead Quality Score items, then rescores it with the published model. Get the item keys from get_lead_quality_details.',
    'VERIFIED earns the item\'s points and needs the evidence and the public source_url you verified it on; FAILED (checked, not met) needs the reason; PENDING clears an earlier decision. Partial credit comes only from verifying sub-criteria — there is no way to set a score directly.',
    NO_INVENTION,
    'run_external_checks also re-runs the server\'s own Instagram, Google Maps and website checks.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  schema: z
    .object({
      ...leadTarget,
      decisions: z.array(evidenceDecisionSchema).min(1).max(50),
      run_external_checks: z.boolean().default(false),
    })
    .strict(),
  async run(context, args) {
    if (assertTarget(args) === 'LEAD') {
      // A CRM lead's external checks run through calculate_lead_quality_score; evidence first, then that if asked.
      const recorded = await runCrm(context, RECORD_EVIDENCE, { entity_type: args.entity_type, lead_id: args.lead_id, decisions: args.decisions }, 'recordCrmLeadEvidence');
      if (!args.run_external_checks) return recorded;
      return runCrm(context, RECALCULATE_ONE, { entity_type: args.entity_type, lead_id: args.lead_id, external: true }, 'recalculateCrmLeadQuality');
    }
    return runCrm(context, VERIFY_CANDIDATE, { id: args.candidate_id, decisions: args.decisions, external_checks: args.run_external_checks }, 'verifyCrmLeadCandidateEvidence');
  },
});

export const calculateLeadQualityScoreTool = defineTool({
  name: 'calculate_lead_quality_score',
  title: 'Calculate lead quality score',
  description: [
    '[CRM · Writes data] Rescores one lead or candidate now with the latest published Lead Quality Score model and its recorded evidence, and stores the result (score out of 100, classification, gates, qualification).',
    'run_external_checks also runs the server\'s automatic checks that call Instagram Business Discovery, Google Maps (Serper) and the lead\'s website — use it to reverify. Checks that cannot run are listed in skipped_checks with the reason.',
    DATA_RULE,
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  schema: z.object({ ...leadTarget, run_external_checks: z.boolean().default(false) }).strict(),
  async run(context, args) {
    if (assertTarget(args) === 'LEAD') {
      return runCrm(context, RECALCULATE_ONE, { entity_type: args.entity_type, lead_id: args.lead_id, external: args.run_external_checks }, 'recalculateCrmLeadQuality');
    }
    return runCrm(context, VERIFY_CANDIDATE, { id: args.candidate_id, decisions: [], external_checks: args.run_external_checks }, 'verifyCrmLeadCandidateEvidence');
  },
});

export const recalculateLeadScoresTool = defineTool({
  name: 'recalculate_lead_scores',
  title: 'Recalculate lead scores',
  description: [
    '[CRM · Writes data] Rescores many leads of one type in the background with the published model — the given lead_ids, or every lead of the type when none are given ("Recalculate quality scores for all Venue Leads").',
    'Returns the background job id and how many leads it covers; it appears in the person\'s jobs drawer in the CRM console. run_external_checks makes it slow and spends API quota — only when the user asks to reverify.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  schema: z
    .object({
      entity_type: leadTypeSchema,
      lead_ids: z.array(z.string().min(1).max(64)).max(500).optional(),
      run_external_checks: z.boolean().default(false),
    })
    .strict(),
  async run(context, args) {
    return runCrm(context, RECALCULATE_MANY, { entity_type: args.entity_type, lead_ids: args.lead_ids, external: args.run_external_checks }, 'recalculateCrmLeadQualityScores');
  },
});
