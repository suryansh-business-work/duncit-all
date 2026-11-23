import { crmService } from '@modules/crm/crm/crm.service';
import { HostLeadModel } from '@modules/crm/crm/crm.model';
import { RESEARCH_LEAD_SOURCE } from '@modules/crm/crm/crm.constants';
import { LeadQualityModel } from '@modules/crm/leadQuality/leadQuality.model';
import { leadQualityService } from '@modules/crm/leadQuality/leadQuality.service';
import { LeadCandidateModel } from '../../leadResearch.model';
import { leadResearchService, type SaveInput } from '../../leadResearch.service';

/**
 * The Lead Research queue: researched leads are validated, traced to a public
 * source, de-duplicated against the CRM and every earlier batch, scored with
 * the published model, and only reach the CRM through approval.
 */

const agent = { id: 'crm-1', name: 'Asha' };
const mcp = { origin: 'MCP' as const, via: 'MCP' as const };

const SOURCE = { kind: 'INSTAGRAM' as const, url: 'https://www.instagram.com/claystudio/', title: 'Clay Studio', text: 'Pottery workshops every weekend in Indiranagar' };

/** A host candidate whose evidence passes all four Host gates (Host has no minimum score). */
const qualifiedHost = (extra: Partial<SaveInput> = {}): SaveInput => ({
  name: 'Clay Studio',
  city: 'Bengaluru',
  area: 'Indiranagar',
  instagram: 'https://www.instagram.com/claystudio/',
  phones: ['9811122233'],
  sources: [SOURCE],
  evidence: [
    { item_key: 'reels_hashtags.authentic_profile', status: 'VERIFIED', evidence: 'Official studio profile', source_url: SOURCE.url },
    { item_key: 'hosting_evidence.past_event_posts', status: 'VERIFIED', evidence: '"Pottery workshops every weekend"', source_url: SOURCE.url },
    { item_key: 'target_city', status: 'VERIFIED', evidence: 'Studio in Indiranagar, Bengaluru', source_url: SOURCE.url },
  ],
  ...extra,
});

describe('saveCandidates', () => {
  it('queues a traceable candidate scored with the published model, uniqueness checked automatically', async () => {
    const report = await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost()], agent, mcp);
    expect(report.refused).toEqual([]);
    const [saved] = report.saved;
    // 6 (profile) + 8 (past events) + 10 (target city) + 5 (CRM uniqueness, automatic).
    expect(saved).toMatchObject({ status: 'NEW', origin: 'MCP', score: 29, qualification: 'QUALIFIED', instagram_handle: 'claystudio', config_version: 1 });
    expect(saved.keys).toEqual(['ig:claystudio', 'phone:9811122233']);
    expect(saved.items.find((i) => i.item_key === 'crm_uniqueness')).toMatchObject({ status: 'VERIFIED', via: 'SYSTEM' });
    expect(saved.items.find((i) => i.item_key === 'target_city')).toMatchObject({ via: 'MCP', actor: agent });
  });

  it('refuses untraceable or invalid candidates with the reasons, and saves the rest', async () => {
    const report = await leadResearchService.saveCandidates(
      'HOST_LEAD',
      [
        { name: 'No Source Studio', instagram: '@nosource' },
        { name: 'Bad Evidence', instagram: '@badevidence', sources: [SOURCE], evidence: [{ item_key: 'target_city', status: 'VERIFIED', evidence: 'trust me' }] },
        qualifiedHost(),
      ],
      agent,
      mcp
    );
    expect(report.refused).toEqual([
      { index: 0, name: 'No Source Studio', reasons: ['at least one public source link (where this lead was found) is required'] },
      { index: 1, name: 'Bad Evidence', reasons: [expect.stringContaining('public source link it was verified from')] },
    ]);
    expect(report.saved).toHaveLength(1);
  });

  it('skips a lead already in the queue from an earlier batch', async () => {
    await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost()], agent, mcp);
    const again = await leadResearchService.saveCandidates('VENUE_LEAD', [qualifiedHost({ name: 'Clay Studio Cafe' })], agent, mcp);
    expect(again.saved).toEqual([]);
    expect(again.already_queued).toEqual([{ index: 0, name: 'Clay Studio Cafe', candidate_id: expect.any(String) }]);
    expect(await LeadCandidateModel.countDocuments({})).toBe(1);
  });

  it('queues a lead already in the CRM as DUPLICATE, naming the lead it matches', async () => {
    const existing = await crmService.createHostLead({ host_name: 'Clay People', contacts: [{ name: 'A', mobile_number: '+91 98111 22233', email: '' }] });
    const report = await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost()], agent, mcp);
    expect(report.saved).toEqual([]);
    expect(report.duplicates[0]).toMatchObject({ status: 'DUPLICATE', duplicates: [{ entity_type: 'HOST_LEAD', lead_id: existing?.id, lead_name: 'Clay People', match: 'PHONE 9811122233' }] });
  });

  it('refuses an empty or oversized batch', async () => {
    await expect(leadResearchService.saveCandidates('HOST_LEAD', [], agent, mcp)).rejects.toThrow('at least one candidate');
    const many = Array.from({ length: 51 }, (_v, i) => qualifiedHost({ name: `Studio ${i}`, instagram: `@studio${i}`, phones: [] }));
    await expect(leadResearchService.saveCandidates('HOST_LEAD', many, agent, mcp)).rejects.toThrow('at most 50');
  });
});

describe('approveCandidates', () => {
  it('adds a qualified candidate through the CRM, carrying its evidence and marking it as research', async () => {
    const [candidate] = (await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost()], agent, mcp)).saved;
    const [outcome] = await leadResearchService.approveCandidates([String(candidate._id)], agent, { note: 'Good fit' });
    expect(outcome).toMatchObject({ outcome: 'ADDED', name: 'Clay Studio' });
    const lead = await HostLeadModel.findById(outcome.crm_lead_id).lean();
    expect(lead).toMatchObject({ host_name: 'Clay Studio', city: 'Bengaluru', instagram_link: 'https://www.instagram.com/claystudio/', lead_source: RESEARCH_LEAD_SOURCE });
    expect(lead?.quality).toMatchObject({ score: 29, qualification: 'QUALIFIED' });
    const record = await LeadQualityModel.findOne({ entity_type: 'HOST_LEAD', lead_id: outcome.crm_lead_id }).lean();
    expect(record).toMatchObject({ origin: 'RESEARCH', candidate_id: String(candidate._id) });
    expect(await LeadCandidateModel.findById(candidate._id).lean()).toMatchObject({ status: 'ADDED', crm_lead_id: outcome.crm_lead_id, decision_note: 'Good fit' });
    const history = await leadQualityService.history('HOST_LEAD', String(outcome.crm_lead_id));
    expect(history.some((e) => e.kind === 'EVIDENCE' && e.note.startsWith('Carried over from Lead Research candidate'))).toBe(true);
  });

  it('refuses an unqualified candidate with the reason unless asked to add it anyway', async () => {
    const [weak] = (await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost({ evidence: [] })], agent, mcp)).saved;
    const [refused] = await leadResearchService.approveCandidates([String(weak._id)], agent, {});
    expect(refused).toMatchObject({ outcome: 'NOT_QUALIFIED', crm_lead_id: null, message: expect.stringContaining('Gates still to verify') });
    const [added] = await leadResearchService.approveCandidates([String(weak._id)], agent, { allow_unqualified: true });
    expect(added.outcome).toBe('ADDED');
    const [again] = await leadResearchService.approveCandidates([String(weak._id)], agent, { allow_unqualified: true });
    expect(again).toMatchObject({ outcome: 'SKIPPED', message: 'Already ADDED.' });
  });

  it('catches a duplicate that appeared after the candidate was queued', async () => {
    const [candidate] = (await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost()], agent, mcp)).saved;
    await crmService.createHostLead({ host_name: 'Someone Else', instagram_link: 'https://instagram.com/claystudio' });
    const [outcome] = await leadResearchService.approveCandidates([String(candidate._id)], agent, {});
    expect(outcome).toMatchObject({ outcome: 'DUPLICATE', message: expect.stringContaining('Someone Else') });
    expect((await LeadCandidateModel.findById(candidate._id).lean())?.status).toBe('DUPLICATE');
  });

  it('refuses a venue candidate without a city, and puts it back in the queue', async () => {
    const [venue] = (await leadResearchService.saveCandidates('VENUE_LEAD', [qualifiedHost({ city: '', evidence: [] })], agent, mcp)).saved;
    const [outcome] = await leadResearchService.approveCandidates([String(venue._id)], agent, { allow_unqualified: true });
    expect(outcome).toMatchObject({ outcome: 'FAILED', message: expect.stringContaining('needs a city') });
    expect((await LeadCandidateModel.findById(venue._id).lean())?.status).toBe('NEW');
  });

  it('validates the ids', async () => {
    await expect(leadResearchService.approveCandidates([], agent, {})).rejects.toThrow('at least one candidate');
    await expect(leadResearchService.approveCandidates(['nope'], agent, {})).rejects.toThrow('not valid');
    const [missing] = await leadResearchService.approveCandidates(['64b7f0c2a1e4c9d3f0a1b2c3'], agent, {});
    expect(missing).toMatchObject({ outcome: 'FAILED', message: 'Candidate not found.' });
  });
});

describe('verify, reject, table and duplicate check', () => {
  it('records evidence on a candidate and rescores it', async () => {
    const [candidate] = (await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost({ evidence: [] })], agent, mcp)).saved;
    const updated = await leadResearchService.verifyCandidate(
      String(candidate._id),
      [{ item_key: 'booking_link', status: 'VERIFIED', evidence: 'Bookings on Insider', source_url: 'https://insider.in/claystudio' }],
      agent,
      'MCP',
      false
    );
    expect(updated).toMatchObject({ score: 15 });
    await expect(leadResearchService.verifyCandidate('64b7f0c2a1e4c9d3f0a1b2c3', [], agent, 'MCP', false)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });

  it('rejects only candidates still waiting and lists the queue by status', async () => {
    const report = await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost(), qualifiedHost({ name: 'Wheel House', instagram: '@wheelhouse', phones: [] })], agent, mcp);
    const ids = report.saved.map((c) => String(c._id));
    expect(await leadResearchService.rejectCandidates(ids, agent, 'Outside our area')).toBe(2);
    expect(await leadResearchService.rejectCandidates(ids, agent)).toBe(0);
    const page = await leadResearchService.table({ filters: [{ field: 'status', op: 'eq', value: 'REJECTED' }] });
    expect(page.total).toBe(2);
    expect((await leadResearchService.candidate(ids[0]))?.decision_note).toBe('Outside our area');
    expect(await leadResearchService.candidate('nope')).toBeNull();
  });

  it('says whether a lead would be a duplicate of the CRM or the queue', async () => {
    await crmService.createHostLead({ host_name: 'Clay People', website: 'https://claystudio.in' });
    await leadResearchService.saveCandidates('HOST_LEAD', [qualifiedHost()], agent, mcp);
    const check = await leadResearchService.duplicateCheck('HOST_LEAD', { name: 'Clay', website: 'https://claystudio.in/', instagram: '@claystudio' });
    expect(check).toMatchObject({ is_duplicate: true, crm_matches: [expect.objectContaining({ lead_name: 'Clay People', match: expect.stringContaining('WEBSITE') })] });
    expect(check.queued_candidates).toEqual([expect.objectContaining({ name: 'Clay Studio', status: 'NEW' })]);
    await expect(leadResearchService.duplicateCheck('HOST_LEAD', { name: 'X' })).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });
});
