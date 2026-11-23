import { parse } from 'graphql';
import { z } from 'zod';
import { defineTool } from '../define';
import { candidateSchema, CRM_LISTING, DATA_RULE, defined, leadTypeSchema, NO_INVENTION, runCrm } from './lead-tools.shared';

/**
 * Lead discovery tools: start a background discovery of new public leads,
 * follow it, cancel or retry it, hand in leads the assistant researched
 * itself, and — only after the person says yes — add qualified candidates to
 * the CRM. Every candidate is de-duplicated and scored by the server with the
 * published model; nothing reaches the CRM without approveCrmLeadCandidates.
 */

const JOB_FIELDS = `
  id
  status
  label
  total
  succeeded
  failed
  error_message
  created_at
  finished_at
  lead_type
  city
  locality
  category
  keywords
  target_count
  min_score
  sources
  queries
  plan_note
  searches_run
  failures {
    id
    message
  }
  stats {
    found
    saved
    qualifying
    duplicates
    already_queued
    refused
  }
`;

const CANDIDATE_FIELDS = `
  id
  status
  name
  city
  area
  address
  phones
  emails
  website
  instagram_url
  score
  qualification
  classification_label
  missing_evidence
  skipped_checks
  duplicates {
    entity_type
    lead_id
    lead_name
    match
  }
  sources {
    kind
    url
    title
  }
`;

export const START_DISCOVERY = parse(`mutation McpStartLeadDiscovery($input: CrmLeadDiscoveryInput!) { startCrmLeadDiscovery(input: $input) { ${JOB_FIELDS} } }`);
export const DISCOVERY_JOB = parse(
  `query McpLeadDiscoveryJob($id: ID!, $candidate_limit: Int) { crmLeadDiscoveryJob(id: $id, candidate_limit: $candidate_limit) { ${JOB_FIELDS} candidates { ${CANDIDATE_FIELDS} } } }`
);
export const CANCEL_DISCOVERY = parse(`mutation McpCancelLeadDiscovery($id: ID!) { cancelCrmLeadDiscovery(id: $id) { ${JOB_FIELDS} } }`);
export const RETRY_DISCOVERY = parse(`mutation McpRetryLeadDiscovery($id: ID!) { retryCrmLeadDiscovery(id: $id) { ${JOB_FIELDS} } }`);
export const SAVE_CANDIDATES = parse(
  `mutation McpSaveLeadCandidates($lead_type: CrmEntityType!, $candidates: [CrmLeadCandidateInput!]!, $external_checks: Boolean) { saveCrmLeadCandidates(lead_type: $lead_type, candidates: $candidates, external_checks: $external_checks) { saved { ${CANDIDATE_FIELDS} } duplicates { ${CANDIDATE_FIELDS} } already_queued { index name candidate_id } refused { index name reasons } } }`
);
export const APPROVE_CANDIDATES = parse(
  `mutation McpApproveLeadCandidates($ids: [ID!]!, $allow_unqualified: Boolean, $note: String) { approveCrmLeadCandidates(ids: $ids, allow_unqualified: $allow_unqualified, note: $note) { candidate_id name outcome crm_lead_id message } }`
);

const jobId = z.string().min(1).max(64).describe('The job id discover_external_leads returned.');

export const discoverExternalLeadsTool = defineTool({
  name: 'discover_external_leads',
  title: 'Discover external leads',
  description: [
    '[CRM · Writes data] Starts a background discovery of NEW public leads for the CRM: plans Google searches for the lead type, city and locality, reads Instagram business profiles and Google Maps listings through Duncit\'s authorised integrations (Serper, Instagram Business Discovery), checks every find against all CRM leads and earlier batches for duplicates, reads evidence from each find\'s public text, and scores it with the published Lead Quality Score model.',
    'Candidates go to the CRM › Lead Research review queue — never straight into the CRM. Returns a job id at once; follow it with get_lead_search_job_status.',
    'Examples: "Search 50 verified Host Leads in Lucknow" → lead_type HOST_LEAD, city Lucknow, target_count 50; "20 Venue Leads in Gomti Nagar above 60" → VENUE_LEAD, city Lucknow, locality Gomti Nagar, target_count 20, min_score 60.',
    'It does not scrape Instagram or Google beyond those integrations; when one is not set up the job says so instead of guessing.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  outward: true,
  schema: z
    .object({
      lead_type: leadTypeSchema,
      city: z.string().min(2).max(80),
      locality: z.string().max(80).optional(),
      category: z.string().max(80).optional().describe('What kind of lead, e.g. pottery workshops, cafes, running clubs.'),
      keywords: z.string().max(200).optional(),
      target_count: z.number().int().min(1).max(100).default(20).describe('How many new qualifying leads to find.'),
      min_score: z.number().min(0).max(100).optional().describe('Count only candidates scoring at least this.'),
      sources: z.array(z.enum(['INSTAGRAM', 'GOOGLE_MAPS'])).max(2).optional().describe('Defaults by lead type (Google Maps + Instagram for venues and sellers).'),
      ai_evidence: z.boolean().default(true).describe('Let the AI quote evidence from each find\'s public text (quotes are checked word for word).'),
    })
    .strict(),
  async run(context, args) {
    return runCrm(context, START_DISCOVERY, { input: defined(args) }, 'startCrmLeadDiscovery');
  },
});

export const getLeadSearchJobStatusTool = defineTool({
  name: 'get_lead_search_job_status',
  title: 'Get lead search job status',
  description: [
    '[CRM · Read-only] Progress of a lead discovery: status (RUNNING, COMPLETED, FAILED, CANCELLED), searches run, qualifying leads found against the target, counts of duplicates and refusals, the reason for any failed search, and the candidates found so far with name, contacts, location, Instagram link, score, qualification, missing verification items and source links.',
    'Poll it every 20-30 seconds while RUNNING; report partial results and blocked searches honestly.',
    DATA_RULE,
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  schema: z
    .object({
      job_id: jobId,
      candidate_limit: z.number().int().min(0).max(100).default(25),
      only_new: z.boolean().default(true).describe('Show only NEW candidates (hide duplicates, rejected and added ones).'),
    })
    .strict(),
  async run(context, args) {
    const job = await runCrm<{ candidates: Array<{ status: string }> } & Record<string, unknown>>(
      context,
      DISCOVERY_JOB,
      { id: args.job_id, candidate_limit: args.candidate_limit },
      'crmLeadDiscoveryJob'
    );
    return args.only_new ? { ...job, candidates: job.candidates.filter((c) => c.status === 'NEW') } : job;
  },
});

export const cancelLeadSearchJobTool = defineTool({
  name: 'cancel_lead_search_job',
  title: 'Cancel lead search job',
  description: '[CRM · Destructive] Stops a running lead discovery after its current search. Candidates already found stay in the review queue. Only the person who started it can cancel it. Ask the user first.',
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'DESTRUCTIVE',
  confirm: true,
  schema: z.object({ job_id: jobId }).strict(),
  async run(context, args) {
    return runCrm(context, CANCEL_DISCOVERY, { id: args.job_id }, 'cancelCrmLeadDiscovery');
  },
});

export const retryLeadSearchJobTool = defineTool({
  name: 'retry_lead_search_job',
  title: 'Retry lead search job',
  description: '[CRM · Writes data] Runs a finished, failed or cancelled lead discovery again with the same request and searches. Leads found before are not saved twice. Returns the new job.',
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  outward: true,
  schema: z.object({ job_id: jobId }).strict(),
  async run(context, args) {
    return runCrm(context, RETRY_DISCOVERY, { id: args.job_id }, 'retryCrmLeadDiscovery');
  },
});

export const saveLeadCandidatesTool = defineTool({
  name: 'save_lead_candidates',
  title: 'Save lead candidates',
  description: [
    '[CRM · Writes data] Queues leads YOU researched (for example with your own web search) in the CRM › Lead Research review queue.',
    'The server validates each one like the CRM form, refuses any without a public source link, checks it against every CRM lead and earlier batches (duplicates are queued as DUPLICATE and can never be added; ones already queued are skipped), records the evidence you send, runs its automatic checks and scores it with the published model.',
    NO_INVENTION,
    'Nothing is added to the CRM here; use add_qualified_leads after the user approves.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  schema: z
    .object({
      lead_type: leadTypeSchema,
      candidates: z.array(candidateSchema).min(1).max(50),
      external_checks: z.boolean().default(false).describe('Also run the Instagram, Google Maps and website checks now (uses API quota).'),
    })
    .strict(),
  async run(context, args) {
    return runCrm(context, SAVE_CANDIDATES, args, 'saveCrmLeadCandidates');
  },
});

export const addQualifiedLeadsTool = defineTool({
  name: 'add_qualified_leads',
  title: 'Add qualified leads to the CRM',
  description: [
    '[CRM · Writes data] Confirm with the user first. Adds Lead Research candidates to the CRM as leads, through the CRM\'s own create function (same duplicate guard and permissions as the console). Each lead starts with the candidate\'s evidence and score.',
    'Only QUALIFIED candidates (all mandatory gates passed and the minimum score met) that are not duplicates are added; others come back with the reason. allow_unqualified adds them anyway — only when the user explicitly asks for that.',
    'Show the user the list you are about to add and call with mcp_confirm: true only after they say yes.',
  ].join(' '),
  category: 'crm',
  listedOn: CRM_LISTING,
  risk: 'WRITE',
  confirm: true,
  schema: z
    .object({
      candidate_ids: z.array(z.string().min(1).max(64)).min(1).max(50),
      allow_unqualified: z.boolean().default(false),
      note: z.string().max(300).optional().describe('Why they are being added (saved on each candidate).'),
    })
    .strict(),
  async run(context, args) {
    return runCrm(context, APPROVE_CANDIDATES, { ids: args.candidate_ids, allow_unqualified: args.allow_unqualified, note: args.note }, 'approveCrmLeadCandidates');
  },
});
