jest.mock('@modules/platform/backgroundJob/backgroundJob.runner', () => ({ scheduleJob: jest.fn() }));
jest.mock('@modules/crm/marketing/igLeads/igLead.serper', () => {
  const actual = jest.requireActual('@modules/crm/marketing/igLeads/igLead.serper');
  return { ...actual, serperReady: jest.fn().mockResolvedValue(false) };
});

import type { GraphQLContext } from '@context';
import { crmService } from '@modules/crm/crm/crm.service';
import { leadQualityResolvers as Q } from '../../leadQuality.resolver';
import { leadResearchResolvers as R } from '@modules/crm/leadResearch/leadResearch.resolver';
import { LeadQualityModel } from '../../leadQuality.model';

/**
 * The API every surface uses: CRM staff only, MCP calls attributed as MCP,
 * publishing rescores in the background, search and analytics read the
 * stored scores.
 */

const crm = { user: { id: 'crm-1', email: 'asha@duncit.com', roles: ['CRM_MANAGER'] } } as unknown as GraphQLContext;
const viaMcp = { ...crm, client: { surface: 'API', app: 'mcp-tools' } } as unknown as GraphQLContext;
const member = { user: { id: 'u-1', roles: ['USER'] } } as unknown as GraphQLContext;

const venue = async (name: string, handle: string, extra: Record<string, unknown> = {}) =>
  String((await crmService.createVenueLead({ venue_name: name, city: 'Lucknow', full_address: 'Gomti Nagar', instagram_link: `https://www.instagram.com/${handle}/`, ...extra }))?.id);

const SOURCE = 'https://www.instagram.com/thebarn/';

describe('permissions', () => {
  it('refuses everyone outside the CRM team, for reads and writes alike', async () => {
    await expect(Q.Query.crmLeadQualitySettings({}, { lead_type: 'VENUE_LEAD' }, member)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    expect(() => Q.Query.searchCrmLeads({}, { input: {} }, member)).toThrow('Access Denied');
    await expect(Q.Mutation.recordCrmLeadEvidence({}, { entity_type: 'VENUE_LEAD', lead_id: 'x', decisions: [] }, member)).rejects.toMatchObject({
      extensions: { code: 'FORBIDDEN' },
    });
    await expect(R.Mutation.approveCrmLeadCandidates({}, { ids: ['x'] }, member)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
    await expect(R.Query.crmLeadCandidatesTable({}, {}, { user: null } as unknown as GraphQLContext)).rejects.toBeDefined();
  });

  it('refuses an unknown lead type', async () => {
    await expect(Q.Query.crmLeadQualitySettings({}, { lead_type: 'PET_LEAD' }, crm)).rejects.toThrow('Unknown lead type');
  });
});

describe('settings', () => {
  it('reads, validates, drafts, publishes (starting a rescore) and lists versions', async () => {
    const lead = await venue('The Barn', 'thebarn');
    const settings = await Q.Query.crmLeadQualitySettings({}, { lead_type: 'VENUE_LEAD' }, crm);
    expect(settings).toMatchObject({ lead_type: 'VENUE_LEAD', draft: null, published: { version: 1, weightage_total: 100 } });
    const input = { criteria: [{ name: 'Everything', weightage: 100 }], min_qualification_score: 50, bands: [{ label: 'All', min: 0, tone: 'warning' }] };
    expect(Q.Query.validateCrmLeadQualityConfig({}, { lead_type: 'VENUE_LEAD', input, mode: 'PUBLISH' }, crm)).toEqual([]);
    const draft = await Q.Mutation.saveCrmLeadQualityDraft({}, { lead_type: 'VENUE_LEAD', input, change_note: 'Simplify' }, crm);
    expect(draft).toMatchObject({ status: 'DRAFT', version: 2, weightage_total: 100 });
    const published = await Q.Mutation.publishCrmLeadQualityConfig({}, { lead_type: 'VENUE_LEAD', revision: draft.revision }, crm);
    expect(published.config).toMatchObject({ status: 'PUBLISHED', version: 2 });
    expect(published.recalculation_job_id).toEqual(expect.any(String));
    expect((await Q.Query.crmLeadQualityVersions({}, { lead_type: 'VENUE_LEAD' }, crm)).map((v) => v.status)).toEqual(['PUBLISHED', 'ARCHIVED']);
    const history = await Q.Query.crmLeadQualitySettingsHistory({}, { lead_type: 'VENUE_LEAD' }, crm);
    expect(history.map((e) => e.kind)).toEqual(expect.arrayContaining(['CONFIG_DRAFT', 'CONFIG_PUBLISH']));
    expect((await Q.Query.crmLeadQuality({}, { entity_type: 'VENUE_LEAD', lead_id: lead }, crm)).stale).toBe(true);
    const restored = await Q.Mutation.startCrmLeadQualityDraftFromVersion({}, { lead_type: 'VENUE_LEAD', version: 1 }, crm);
    expect(restored.criteria).toHaveLength(9);
    expect(await Q.Mutation.deleteCrmLeadQualityDraft({}, { lead_type: 'VENUE_LEAD' }, crm)).toBe(true);
  });
});

describe('evidence and scores', () => {
  it('records evidence attributed to MCP, which needs the source link, and rescores', async () => {
    const lead = await venue('The Barn', 'thebarn');
    await expect(
      Q.Mutation.recordCrmLeadEvidence({}, { entity_type: 'VENUE_LEAD', lead_id: lead, decisions: [{ item_key: 'capacity', status: 'VERIFIED', evidence: '60 seats' }] }, viaMcp)
    ).rejects.toThrow('public source link');
    const response = await Q.Mutation.recordCrmLeadEvidence(
      {},
      { entity_type: 'VENUE_LEAD', lead_id: lead, decisions: [{ item_key: 'capacity', status: 'VERIFIED', evidence: '60 seats', source_url: SOURCE }] },
      viaMcp
    );
    expect(response.details.result?.score).toBe(10);
    expect(response.details.evidence.find((e) => e.item_key === 'capacity')).toMatchObject({ via: 'MCP', source_url: SOURCE });
    expect(response.details.config.weightage_total).toBe(100);
    const history = await Q.Query.crmLeadQualityHistory({}, { entity_type: 'VENUE_LEAD', lead_id: lead }, crm);
    expect(history[0].created_at).toEqual(expect.any(String));
  });

  it('rescores one lead now, reporting checks that could not run, and many in the background', async () => {
    const lead = await venue('The Barn', 'thebarn');
    const response = await Q.Mutation.recalculateCrmLeadQuality({}, { entity_type: 'VENUE_LEAD', lead_id: lead, external: true }, crm);
    expect(response.skipped_checks).toEqual(expect.arrayContaining([expect.stringContaining('Serper API key')]));
    const bulk = await Q.Mutation.recalculateCrmLeadQualityScores({}, { entity_type: 'VENUE_LEAD' }, crm);
    expect(bulk).toEqual({ job_id: expect.any(String), total: 1 });
    expect(await Q.Mutation.recalculateCrmLeadQualityScores({}, { entity_type: 'HOST_LEAD' }, crm)).toEqual({ job_id: null, total: 0 });
  });
});

describe('search and analytics', () => {
  it('finds leads across types by score, and reports the stored scores', async () => {
    const strong = await venue('Studio Nine', 'studionine');
    await venue('The Barn', 'thebarn');
    await crmService.createHostLead({ host_name: 'Clay Work', city: 'Lucknow', instagram_link: 'https://www.instagram.com/claywork/', lead_status: 'Won' });
    await Q.Mutation.recordCrmLeadEvidence({}, { entity_type: 'VENUE_LEAD', lead_id: strong, decisions: [{ item_key: 'capacity', status: 'VERIFIED', evidence: '60 seats' }] }, crm);
    await LeadQualityModel.updateOne({ entity_type: 'VENUE_LEAD', lead_id: strong }, { $set: { origin: 'RESEARCH' } });

    const page = await Q.Query.searchCrmLeads({}, { input: { sort: 'SCORE_DESC', page_size: 10 } }, crm);
    expect(page.total).toBe(3);
    expect(page.rows.map((r) => [r.name, r.quality?.score])).toEqual([
      ['Studio Nine', 10],
      ['Clay Work', 5],
      ['The Barn', 2],
    ]);
    const low = await Q.Query.searchCrmLeads({}, { input: { entity_types: ['VENUE_LEAD'], max_score: 5, city: 'lucknow' } }, crm);
    expect(low.rows.map((r) => r.name)).toEqual(['The Barn']);
    const byName = await Q.Query.searchCrmLeads({}, { input: { search: 'clay', qualification: 'PENDING_VERIFICATION', has_failed_gates: false } }, crm);
    expect(byName.rows.map((r) => r.entity_type)).toEqual(['HOST_LEAD']);
    expect((await Q.Query.searchCrmLeads({}, { input: { unscored: true } }, crm)).total).toBe(0);

    const analytics = await Q.Query.crmLeadQualityAnalytics({}, {}, crm);
    const venues = analytics.by_type.find((t) => t.entity_type === 'VENUE_LEAD');
    expect(venues).toMatchObject({ total: 2, scored: 2, average_score: 6, pending_verification: 2 });
    expect(venues?.distribution.find((d) => d.key === '0-19')?.count).toBe(2);
    expect(analytics.top_leads[0]).toMatchObject({ name: 'Studio Nine', score: 10 });
    expect(analytics.cities).toEqual([expect.objectContaining({ city: 'Lucknow', leads: 3 })]);
    expect(analytics.conversion).toEqual([expect.objectContaining({ classification: 'very_low', leads: 3, won: 1, conversion_rate: 33.33 })]);
    expect(analytics.origins).toEqual(expect.arrayContaining([expect.objectContaining({ origin: 'RESEARCH', leads: 1, average_score: 10 })]));
    expect(analytics.missing_evidence.length).toBeGreaterThan(0);
    expect(analytics.trend[0]).toMatchObject({ leads: 3 });
    const one = await Q.Query.crmLeadQualityAnalytics({}, { entity_type: 'HOST_LEAD' }, crm);
    expect(one.by_type.map((t) => t.entity_type)).toEqual(['HOST_LEAD']);
  });
});

describe('research API', () => {
  it('queues an MCP-researched lead as MCP origin and shows what is still missing', async () => {
    const report = await R.Mutation.saveCrmLeadCandidates(
      {},
      { lead_type: 'HOST_LEAD', candidates: [{ name: 'Clay Studio', instagram: '@claystudio', sources: [{ url: 'https://www.instagram.com/claystudio/' }] }] },
      viaMcp
    );
    const [candidate] = report.saved;
    expect(candidate).toMatchObject({ origin: 'MCP', instagram_url: 'https://www.instagram.com/claystudio/', score: 5 });
    expect(candidate?.missing_evidence).toEqual(expect.arrayContaining(['Target-City Verification', 'Previous Hosting Evidence › Posts or photos of events they hosted']));
    const id = String(candidate?.id);
    expect((await R.Query.crmLeadCandidate({}, { id }, crm))?.id).toBe(id);
    const table = await R.Query.crmLeadCandidatesTable({}, { query: { sort_by: 'score', sort_dir: 'desc' } }, crm);
    expect(table.total).toBe(1);
    const verified = await R.Mutation.verifyCrmLeadCandidateEvidence(
      {},
      { id, decisions: [{ item_key: 'target_city', status: 'VERIFIED', evidence: 'Studio in Bengaluru', source_url: 'https://www.instagram.com/claystudio/' }] },
      viaMcp
    );
    expect(verified?.score).toBe(15);
    const duplicates = await R.Query.checkCrmLeadDuplicates({}, { lead_type: 'HOST_LEAD', input: { name: 'Clay', instagram: '@claystudio' } }, crm);
    expect(duplicates.queued_candidates).toHaveLength(1);
    const [outcome] = await R.Mutation.approveCrmLeadCandidates({}, { ids: [id] }, crm);
    expect(outcome.outcome).toBe('NOT_QUALIFIED');
    expect(await R.Mutation.rejectCrmLeadCandidates({}, { ids: [id], note: 'Not now' }, crm)).toBe(1);
  });

  it('refuses to start a discovery without Serper, and reads the job list', async () => {
    await expect(R.Mutation.startCrmLeadDiscovery({}, { input: { lead_type: 'VENUE_LEAD', city: 'Lucknow' } }, crm)).rejects.toMatchObject({
      extensions: { code: 'NOT_CONFIGURED' },
    });
    expect(await R.Query.crmLeadDiscoveryJobs({}, {}, crm)).toEqual([]);
  });
});
