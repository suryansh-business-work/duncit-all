import { validate, type DocumentNode } from 'graphql';
import { resolvers, typeDefsByModule } from '@modules/index';
import { getCatalog, registerCatalogSource } from '../../catalog/catalog';
import { needsConfirmation, riskOf } from '../../catalog/risk';
import { GATEWAY_ENDPOINT } from '../../mcp.constants';
import { instructionsFor, LEAD_RESEARCH_RULE } from '../../server/mcp.server';
import { findPrompt } from '../../server/prompts';
import { CURATED_TOOLS } from '../../tools/curated';
import * as discovery from '../../tools/crm/lead-discovery.tools';
import * as scoring from '../../tools/crm/lead-scoring.tools';
import * as search from '../../tools/crm/lead-search.tools';
import { assertTarget, runCrm } from '../../tools/crm/lead-tools.shared';
import { toolContext, type FakeContext } from './fixtures';

/**
 * The CRM lead research tools (PRD 31): every operation they run is valid
 * against the API actually served, they pass the AI's arguments through
 * unchanged, keep the API's own refusals, and the ones that change the CRM ask
 * for the person's yes.
 */

registerCatalogSource({ typeDefsByModule, resolvers });
const { schema } = getCatalog();

const PRD_TOOLS = [
  'search_crm_leads',
  'discover_external_leads',
  'verify_lead_evidence',
  'calculate_lead_quality_score',
  'check_lead_duplicates',
  'get_lead_quality_details',
  'save_lead_candidates',
  'add_qualified_leads',
  'recalculate_lead_scores',
  'get_lead_search_job_status',
];

const documents = Object.entries({ ...discovery, ...scoring, ...search }).filter(
  (entry): entry is [string, DocumentNode] => typeof entry[1] === 'object' && (entry[1] as DocumentNode).kind === 'Document'
);

let context: FakeContext;
const run = (name: string, args: Record<string, unknown>) => {
  const tool = CURATED_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`no tool ${name}`);
  return tool.run(context, args);
};
const lastVariables = () => context.execute.mock.calls.at(-1)?.[1];

beforeEach(() => {
  context = toolContext({ endpoint: 'crm' });
});

describe('the CRM lead tools', () => {
  it('include every tool the brief names, listed on the gateway and the CRM connector', () => {
    for (const name of PRD_TOOLS) {
      const tool = CURATED_TOOLS.find((t) => t.name === name);
      expect(tool).toBeDefined();
      expect(tool?.listedOn).toEqual([GATEWAY_ENDPOINT, 'crm']);
      expect(tool?.category).toBe('crm');
    }
  });

  it.each(documents.map(([name, doc]) => [name, doc] as const))('%s is valid against the served schema', (_name, doc) => {
    expect(validate(schema, doc)).toEqual([]);
  });

  it('asks for the person’s yes before adding leads or cancelling a discovery', () => {
    const byName = (name: string) => CURATED_TOOLS.find((t) => t.name === name);
    expect(byName('add_qualified_leads')).toMatchObject({ confirm: true, risk: 'WRITE' });
    expect(byName('cancel_lead_search_job')).toMatchObject({ confirm: true, risk: 'DESTRUCTIVE' });
    expect(byName('search_crm_leads')).toMatchObject({ confirm: false, risk: 'READ' });
  });

  it('makes the derived API tools ask too: publish, approve, reject, delete draft, cancel', () => {
    expect(needsConfirmation('MUTATION', 'publishCrmLeadQualityConfig')).toBe(true);
    expect(needsConfirmation('MUTATION', 'approveCrmLeadCandidates')).toBe(true);
    expect(riskOf('MUTATION', 'rejectCrmLeadCandidates')).toBe('DESTRUCTIVE');
    expect(riskOf('MUTATION', 'deleteCrmLeadQualityDraft')).toBe('DESTRUCTIVE');
    expect(riskOf('MUTATION', 'cancelCrmLeadDiscovery')).toBe('DESTRUCTIVE');
    expect(needsConfirmation('MUTATION', 'recordCrmLeadEvidence')).toBe(false);
  });
});

describe('runCrm', () => {
  it('returns the operation field', async () => {
    context.execute.mockResolvedValue({ data: { searchCrmLeads: { total: 1 } } });
    await expect(runCrm(context, search.SEARCH_CRM_LEADS, {}, 'searchCrmLeads')).resolves.toEqual({ total: 1 });
  });

  it('throws the API’s own error with its code and field errors', async () => {
    context.execute.mockResolvedValue({ data: null, errors: [{ message: 'Weightage cannot exceed 100%.', extensions: { code: 'BAD_USER_INPUT', errors: ['criteria: Weightage cannot exceed 100%.'] } }] });
    await expect(runCrm(context, search.SEARCH_CRM_LEADS, {}, 'searchCrmLeads')).rejects.toMatchObject({
      message: 'Weightage cannot exceed 100%.',
      extensions: { code: 'BAD_USER_INPUT', errors: ['criteria: Weightage cannot exceed 100%.'] },
    });
  });

  it('returns null for a missing record without an error', async () => {
    context.execute.mockResolvedValue({ data: { crmLeadCandidate: null } });
    await expect(runCrm(context, search.CANDIDATE_DETAILS, { id: 'x' }, 'crmLeadCandidate')).resolves.toBeNull();
  });
});

describe('assertTarget', () => {
  it('takes a CRM lead or a candidate, never both or neither', () => {
    expect(assertTarget({ entity_type: 'VENUE_LEAD', lead_id: 'l1' })).toBe('LEAD');
    expect(assertTarget({ candidate_id: 'c1' })).toBe('CANDIDATE');
    expect(() => assertTarget({})).toThrow('Pass either entity_type with lead_id');
    expect(() => assertTarget({ entity_type: 'VENUE_LEAD', lead_id: 'l1', candidate_id: 'c1' })).toThrow('Pass either');
  });
});

describe('tool calls', () => {
  it('search_crm_leads sends the filters as the search input, lead types renamed', async () => {
    context.execute.mockResolvedValue({ data: { searchCrmLeads: { rows: [], total: 0 } } });
    await run('search_crm_leads', { lead_types: ['VENUE_LEAD'], max_score: 59.99, sort: 'SCORE_ASC', page: 1, page_size: 50 });
    expect(lastVariables()).toEqual({ input: { entity_types: ['VENUE_LEAD'], max_score: 59.99, sort: 'SCORE_ASC', page: 1, page_size: 50 } });
  });

  it('search_crm_leads refuses an unknown filter before calling the API', async () => {
    await expect(run('search_crm_leads', { score_above: 60 })).rejects.toMatchObject({ code: 'INVALID_ARGUMENTS' });
    expect(context.execute).not.toHaveBeenCalled();
  });

  it('get_lead_quality_details reads a CRM lead or a candidate', async () => {
    context.execute.mockResolvedValue({ data: { crmLeadQuality: { lead_id: 'l1' } } });
    await run('get_lead_quality_details', { entity_type: 'HOST_LEAD', lead_id: 'l1' });
    expect(context.execute.mock.calls[0][0]).toBe(search.LEAD_QUALITY_DETAILS);
    context.execute.mockResolvedValue({ data: { crmLeadCandidate: null } });
    await expect(run('get_lead_quality_details', { candidate_id: 'c1' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('discover_external_leads starts a discovery with the request as given', async () => {
    context.execute.mockResolvedValue({ data: { startCrmLeadDiscovery: { id: 'j1', status: 'RUNNING' } } });
    const job = await run('discover_external_leads', { lead_type: 'VENUE_LEAD', city: 'Lucknow', locality: 'Gomti Nagar', target_count: 20, min_score: 60 });
    expect(job).toEqual({ id: 'j1', status: 'RUNNING' });
    expect(lastVariables()).toEqual({ input: { lead_type: 'VENUE_LEAD', city: 'Lucknow', locality: 'Gomti Nagar', target_count: 20, min_score: 60, ai_evidence: true } });
  });

  it('get_lead_search_job_status hides non-new candidates unless asked', async () => {
    const job = { id: 'j1', candidates: [{ status: 'NEW' }, { status: 'DUPLICATE' }] };
    context.execute.mockResolvedValue({ data: { crmLeadDiscoveryJob: job } });
    expect(await run('get_lead_search_job_status', { job_id: 'j1' })).toEqual({ id: 'j1', candidates: [{ status: 'NEW' }] });
    expect(await run('get_lead_search_job_status', { job_id: 'j1', only_new: false })).toEqual(job);
  });

  it('save_lead_candidates refuses a candidate without a source before calling the API', async () => {
    await expect(run('save_lead_candidates', { lead_type: 'HOST_LEAD', candidates: [{ name: 'Clay Studio', instagram: '@clay', sources: [] }] })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENTS',
    });
    expect(context.execute).not.toHaveBeenCalled();
  });

  it('add_qualified_leads approves only what it was given, unqualified ones only on request', async () => {
    context.execute.mockResolvedValue({ data: { approveCrmLeadCandidates: [] } });
    await run('add_qualified_leads', { candidate_ids: ['c1', 'c2'] });
    expect(lastVariables()).toEqual({ ids: ['c1', 'c2'], allow_unqualified: false, note: undefined });
  });

  it('verify_lead_evidence records evidence on a lead, then reverifies when asked', async () => {
    context.execute
      .mockResolvedValueOnce({ data: { recordCrmLeadEvidence: { skipped_checks: [] } } })
      .mockResolvedValueOnce({ data: { recalculateCrmLeadQuality: { skipped_checks: ['x'] } } });
    const decisions = [{ item_key: 'instagram.authentic_profile', status: 'VERIFIED', evidence: 'Official profile', source_url: 'https://www.instagram.com/thebarn/' }];
    const result = await run('verify_lead_evidence', { entity_type: 'VENUE_LEAD', lead_id: 'l1', decisions, run_external_checks: true });
    expect(result).toEqual({ skipped_checks: ['x'] });
    expect(context.execute.mock.calls[0][0]).toBe(scoring.RECORD_EVIDENCE);
    expect(context.execute.mock.calls[1][1]).toEqual({ entity_type: 'VENUE_LEAD', lead_id: 'l1', external: true });
  });

  it('verify_lead_evidence on a candidate goes to the candidate', async () => {
    context.execute.mockResolvedValue({ data: { verifyCrmLeadCandidateEvidence: { id: 'c1' } } });
    await run('verify_lead_evidence', { candidate_id: 'c1', decisions: [{ item_key: 'contact.phone', status: 'FAILED', evidence: 'Number not in service' }] });
    expect(context.execute.mock.calls[0][0]).toBe(scoring.VERIFY_CANDIDATE);
  });

  it('verify_lead_evidence refuses a source that is not a web link', async () => {
    await expect(
      run('verify_lead_evidence', { candidate_id: 'c1', decisions: [{ item_key: 'a', status: 'VERIFIED', evidence: 'seen', source_url: 'javascript:alert(1)' }] })
    ).rejects.toMatchObject({ code: 'INVALID_ARGUMENTS' });
  });

  it('calculate_lead_quality_score rescores a candidate with no new decisions', async () => {
    context.execute.mockResolvedValue({ data: { verifyCrmLeadCandidateEvidence: { id: 'c1' } } });
    await run('calculate_lead_quality_score', { candidate_id: 'c1', run_external_checks: true });
    expect(lastVariables()).toEqual({ id: 'c1', decisions: [], external_checks: true });
  });

  it('recalculate_lead_scores starts a background job for the whole type', async () => {
    context.execute.mockResolvedValue({ data: { recalculateCrmLeadQualityScores: { job_id: 'j9', total: 120 } } });
    expect(await run('recalculate_lead_scores', { entity_type: 'VENUE_LEAD' })).toEqual({ job_id: 'j9', total: 120 });
    expect(lastVariables()).toEqual({ entity_type: 'VENUE_LEAD', lead_ids: undefined, external: false });
  });
});

describe('prompts and instructions', () => {
  it('find_crm_leads walks through discovery, verification and a confirmed add', () => {
    const prompt = findPrompt('find_crm_leads');
    const text = prompt?.render({ lead_type: 'VENUE_LEAD', city: 'Lucknow', locality: 'Gomti Nagar', count: '20', min_score: '60' }) ?? '';
    expect(text).toContain('Find 20 new VENUE_LEAD leads in Gomti Nagar, Lucknow scoring at least 60/100');
    expect(text).toContain('discover_external_leads');
    expect(text).toContain('mcp_confirm: true');
    expect(text).toContain('Never invent a lead');
  });

  it('tells gateway and CRM clients how to research leads, and nobody else', () => {
    expect(instructionsFor(GATEWAY_ENDPOINT)).toContain(LEAD_RESEARCH_RULE);
    expect(instructionsFor('crm')).toContain(LEAD_RESEARCH_RULE);
    expect(instructionsFor('pods')).not.toContain(LEAD_RESEARCH_RULE);
  });
});
