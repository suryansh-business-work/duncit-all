import { crmService } from '@modules/crm/crm/crm.service';
import { VenueLeadModel } from '@modules/crm/crm/crm.model';
import { prospectLeadService } from '@modules/crm/prospectLead/prospectLead.service';
import { LeadQualityEventModel, LeadQualityModel } from '../../leadQuality.model';
import { leadQualityService } from '../../leadQuality.service';
import { leadQualityConfigService } from '../../leadQualityConfig.service';

/**
 * One scoring service behind every surface: a lead is scored when it is saved,
 * moves only through recorded evidence, keeps a person's decision over an
 * automatic check, and leaves an append-only history.
 */

const agent = { id: 'crm-1', name: 'Asha' };

const venue = async (extra: Record<string, unknown> = {}) =>
  (await crmService.createVenueLead({
    venue_name: 'The Barn Cafe',
    city: 'Lucknow',
    full_address: '12 Vibhuti Khand, Gomti Nagar',
    instagram_link: 'https://www.instagram.com/thebarn/',
    contacts: [{ name: 'Ravi', mobile_number: '9876500001', email: '' }],
    ...extra,
  }))!;

const summaryOf = async (id: string) => (await VenueLeadModel.findById(id).lean())?.quality;

describe('scoring on save', () => {
  it('scores a new lead from its automatic checks and stores the summary on the lead', async () => {
    const lead = await venue();
    // Only CRM uniqueness (2 points) can be settled without a person or an outside call.
    expect(await summaryOf(lead.id)).toMatchObject({
      score: 2,
      classification: 'very_low',
      tone: 'error',
      qualification: 'PENDING_VERIFICATION',
      verification: 'IN_PROGRESS',
      config_version: 1,
    });
    const record = await LeadQualityModel.findOne({ entity_type: 'VENUE_LEAD', lead_id: lead.id }).lean();
    expect(record?.items).toEqual([expect.objectContaining({ item_key: 'dedup', status: 'VERIFIED', via: 'SYSTEM' })]);
    expect(await LeadQualityEventModel.countDocuments({ kind: 'SCORE', lead_id: lead.id, trigger: 'CREATE' })).toBe(1);
  });

  it('fails uniqueness for a lead that reuses another lead’s Instagram profile', async () => {
    await venue();
    const copy = await venue({ venue_name: 'Barn Again', contacts: [{ name: 'Mira', mobile_number: '9876500002', email: '' }] });
    const details = await leadQualityService.details('VENUE_LEAD', copy.id);
    expect(details.evidence.find((e) => e.item_key === 'dedup')).toMatchObject({ status: 'FAILED', evidence: expect.stringContaining('"The Barn Cafe"') });
    expect(details.result?.qualification).toBe('NOT_QUALIFIED');
  });

  it('scores creator and community leads too', async () => {
    const creator = await prospectLeadService.create('CREATOR_LEAD', { creator_name: 'Riya Runs', city: 'Mumbai', handle: '@riyaruns' });
    const details = await leadQualityService.details('CREATOR_LEAD', String(creator?.id));
    expect(details.result).toMatchObject({ score: 5, qualification: 'PENDING_VERIFICATION' });
  });
});

describe('recordEvidence', () => {
  it('earns points only for verified items, with the evidence and who verified it', async () => {
    const lead = await venue();
    const outcome = await leadQualityService.recordEvidence(
      'VENUE_LEAD',
      lead.id,
      [
        { item_key: 'instagram.authentic_profile', status: 'VERIFIED', evidence: 'Official profile, 2k followers', source_url: 'https://www.instagram.com/thebarn/' },
        { item_key: 'contact.phone', status: 'VERIFIED', evidence: 'Called and confirmed' },
        { item_key: 'capacity', status: 'FAILED', evidence: 'Seats only 8' },
      ],
      agent,
      'MANUAL'
    );
    expect(outcome.result.score).toBe(20);
    const details = await leadQualityService.details('VENUE_LEAD', lead.id);
    expect(details.evidence.find((e) => e.item_key === 'contact.phone')).toMatchObject({ status: 'VERIFIED', via: 'MANUAL', actor: agent, source_url: '' });
    const events = await leadQualityService.history('VENUE_LEAD', lead.id);
    expect(events.filter((e) => e.kind === 'EVIDENCE').map((e) => [e.item_key, e.status_before, e.status_after])).toEqual(
      expect.arrayContaining([
        ['instagram.authentic_profile', 'PENDING', 'VERIFIED'],
        ['contact.phone', 'PENDING', 'VERIFIED'],
        ['capacity', 'PENDING', 'FAILED'],
      ])
    );
    expect(events.find((e) => e.kind === 'SCORE' && e.trigger === 'EVIDENCE')).toMatchObject({ score_before: 2, score_after: 20 });
  });

  it('refuses evidence without proof, unknown items, repeats and an MCP verification without a source', async () => {
    const lead = await venue();
    const refuse = (decisions: Parameters<typeof leadQualityService.recordEvidence>[2], via: 'MANUAL' | 'MCP' = 'MANUAL') =>
      leadQualityService.recordEvidence('VENUE_LEAD', lead.id, decisions, agent, via);
    await expect(refuse([{ item_key: 'contact.phone', status: 'VERIFIED' }])).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await expect(refuse([{ item_key: 'capacity', status: 'FAILED', evidence: '' }])).rejects.toThrow('say why it is not met');
    await expect(refuse([{ item_key: 'made_up', status: 'VERIFIED', evidence: 'x y z' }])).rejects.toThrow('not an item of the published scoring model');
    await expect(
      refuse([
        { item_key: 'capacity', status: 'FAILED', evidence: 'small' },
        { item_key: 'capacity', status: 'FAILED', evidence: 'small' },
      ])
    ).rejects.toThrow('sent twice');
    await expect(refuse([{ item_key: 'contact.phone', status: 'VERIFIED', evidence: 'On their site' }], 'MCP')).rejects.toThrow('public source link');
    await expect(refuse([{ item_key: 'contact.phone', status: 'VERIFIED', evidence: 'Seen', source_url: 'javascript:alert(1)' }])).rejects.toThrow('http(s) link');
    await expect(refuse([])).rejects.toThrow('at least one item');
    expect((await summaryOf(lead.id))?.score).toBe(2);
  });

  it('keeps a person’s decision over the automatic check, and PENDING hands the item back to it', async () => {
    const lead = await venue();
    await leadQualityService.recordEvidence('VENUE_LEAD', lead.id, [{ item_key: 'dedup', status: 'FAILED', evidence: 'Same owner as Barn 1' }], agent, 'MANUAL');
    await leadQualityService.score('VENUE_LEAD', lead.id, { trigger: 'RECALCULATE', actor: agent });
    expect((await summaryOf(lead.id))?.score).toBe(0);
    await leadQualityService.recordEvidence('VENUE_LEAD', lead.id, [{ item_key: 'dedup', status: 'PENDING' }], agent, 'MANUAL');
    expect((await summaryOf(lead.id))?.score).toBe(2);
  });

  it('says when the lead does not exist', async () => {
    await expect(leadQualityService.recordEvidence('VENUE_LEAD', '64b7f0c2a1e4c9d3f0a1b2c3', [], agent, 'MANUAL')).rejects.toMatchObject({
      extensions: { code: 'NOT_FOUND' },
    });
    await expect(leadQualityService.score('VENUE_LEAD', 'not-an-id', { trigger: 'RECALCULATE' })).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('details and configuration changes', () => {
  it('marks a score worked out with an older version stale until it is recalculated', async () => {
    const lead = await venue();
    const published = await leadQualityConfigService.published('VENUE_LEAD');
    await leadQualityConfigService.saveDraft(
      'VENUE_LEAD',
      { criteria: published.criteria as never, min_qualification_score: 50, bands: published.bands as never },
      agent
    );
    await leadQualityConfigService.publish('VENUE_LEAD', agent);
    expect(await leadQualityService.details('VENUE_LEAD', lead.id)).toMatchObject({ stale: true, scored_version: 1, published_version: 2 });
    await leadQualityService.score('VENUE_LEAD', lead.id, { trigger: 'CONFIG_PUBLISH' });
    expect(await leadQualityService.details('VENUE_LEAD', lead.id)).toMatchObject({ stale: false, scored_version: 2, origin: 'MANUAL' });
    expect((await summaryOf(lead.id))?.config_version).toBe(2);
  });
});

describe('deleting a lead', () => {
  it('removes its evidence and keeps its history', async () => {
    const lead = await venue();
    await crmService.deleteVenueLead(lead.id);
    expect(await LeadQualityModel.countDocuments({ lead_id: lead.id })).toBe(0);
    expect(await LeadQualityEventModel.countDocuments({ lead_id: lead.id })).toBeGreaterThan(0);
  });

  it('refuses to rewrite history', async () => {
    const lead = await venue();
    await expect(LeadQualityEventModel.updateOne({ lead_id: lead.id }, { $set: { score_after: 100 } })).rejects.toThrow('append-only');
  });
});

describe('listings', () => {
  it('sorts and filters the venue listing by quality score across the whole collection', async () => {
    const low = await venue();
    const high = await venue({ venue_name: 'Studio Nine', instagram_link: 'https://www.instagram.com/studionine/', contacts: [{ name: 'A', mobile_number: '9876500009', email: '' }] });
    await leadQualityService.recordEvidence('VENUE_LEAD', high.id, [{ item_key: 'capacity', status: 'VERIFIED', evidence: '60 seated' }], agent, 'MANUAL');
    const sorted = await crmService.venueLeadsTable({ sort_by: 'quality_score', sort_dir: 'desc' });
    expect(sorted.rows.map((r: { id: string }) => r.id)).toEqual([high.id, low.id]);
    expect(sorted.rows[0]).toMatchObject({ quality: expect.objectContaining({ score: 10, classification_label: 'Very Low' }) });
    const filtered = await crmService.venueLeadsTable({ filters: [{ field: 'quality_score', op: 'gte', value: '5' }] });
    expect(filtered.rows.map((r: { id: string }) => r.id)).toEqual([high.id]);
  });
});
