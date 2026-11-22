import { LeadQualityConfigModel, LeadQualityEventModel } from '../../leadQuality.model';
import { leadQualityConfigService, type QualityConfigInput } from '../../leadQualityConfig.service';

/**
 * Versions of a lead type's scoring model: the default is seeded once, a draft
 * may sit under 100% but never over, publishing needs exactly 100%, older
 * published versions are archived, and every change leaves a history row.
 */

const admin = { id: 'crm-1', name: 'Asha' };

const config = (weights: number[], extra: Partial<QualityConfigInput> = {}): QualityConfigInput => ({
  criteria: weights.map((weightage, index) => ({ name: `Criterion ${index + 1}`, weightage })),
  min_qualification_score: 60,
  bands: [
    { label: 'Good', min: 60, tone: 'success' },
    { label: 'Low', min: 0, tone: 'error' },
  ],
  ...extra,
});

describe('published and seedDefaults', () => {
  it('seeds version 1 from the defaults the first time a lead type is read, once', async () => {
    const first = await leadQualityConfigService.published('VENUE_LEAD');
    expect(first).toMatchObject({ lead_type: 'VENUE_LEAD', version: 1, status: 'PUBLISHED', min_qualification_score: 61 });
    expect(first.criteria).toHaveLength(9);
    await leadQualityConfigService.published('VENUE_LEAD');
    expect(await LeadQualityConfigModel.countDocuments({ lead_type: 'VENUE_LEAD' })).toBe(1);
  });

  it('seeds every lead type that has nothing, and nothing the second time', async () => {
    await leadQualityConfigService.published('HOST_LEAD');
    expect(await leadQualityConfigService.seedDefaults()).toEqual(['VENUE_LEAD', 'COMMUNITY_LEAD', 'CREATOR_LEAD', 'ECOMM_LEAD']);
    expect(await leadQualityConfigService.seedDefaults()).toEqual([]);
  });
});

describe('saveDraft', () => {
  it('creates the next version as a draft and lets it stay under 100%', async () => {
    await leadQualityConfigService.published('HOST_LEAD');
    const draft = await leadQualityConfigService.saveDraft('HOST_LEAD', config([60, 35]), admin, { change_note: 'Rebalance' });
    expect(draft).toMatchObject({ version: 2, status: 'DRAFT', revision: 1, change_note: 'Rebalance', created_by: admin });
    expect(draft.criteria.map((c) => c.key)).toEqual(['criterion_1', 'criterion_2']);
    expect(await LeadQualityEventModel.countDocuments({ kind: 'CONFIG_DRAFT', entity_type: 'HOST_LEAD' })).toBe(1);
  });

  it('refuses a draft over 100% with every issue listed for the console and for MCP', async () => {
    await expect(leadQualityConfigService.saveDraft('HOST_LEAD', config([60, 45]), admin)).rejects.toMatchObject({
      message: 'Weightage cannot exceed 100%.',
      extensions: {
        code: 'BAD_USER_INPUT',
        issues: [expect.objectContaining({ code: 'TOTAL_OVER', amount: 5 })],
        errors: ['criteria: Weightage cannot exceed 100%.'],
      },
    });
    expect(await LeadQualityConfigModel.countDocuments({ lead_type: 'HOST_LEAD', status: 'DRAFT' })).toBe(0);
  });

  it('refuses text and NaN instead of turning them into numbers', async () => {
    const bad = { criteria: [{ name: 'A', weightage: '50' as unknown as number }], bands: [{ label: 'All', min: 0, tone: 'error' }] };
    await expect(leadQualityConfigService.saveDraft('HOST_LEAD', bad, admin)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
  });

  it('refuses a save carrying an older revision, so nobody overwrites another admin', async () => {
    const draft = await leadQualityConfigService.saveDraft('HOST_LEAD', config([50]), admin);
    const second = await leadQualityConfigService.saveDraft('HOST_LEAD', config([70]), admin, { revision: draft.revision });
    expect(second.revision).toBe(2);
    await expect(leadQualityConfigService.saveDraft('HOST_LEAD', config([80]), admin, { revision: draft.revision })).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
  });
});

describe('publish', () => {
  it('refuses a draft short of 100% and an absent draft', async () => {
    await expect(leadQualityConfigService.publish('ECOMM_LEAD', admin)).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
    await leadQualityConfigService.saveDraft('ECOMM_LEAD', config([60, 35]), admin);
    await expect(leadQualityConfigService.publish('ECOMM_LEAD', admin)).rejects.toMatchObject({
      message: 'Allocate the remaining 5% before publishing.',
    });
  });

  it('publishes exactly 100%, archives the version it replaces and records who did it', async () => {
    await leadQualityConfigService.published('ECOMM_LEAD');
    const draft = await leadQualityConfigService.saveDraft('ECOMM_LEAD', config([60, 40]), admin);
    const published = await leadQualityConfigService.publish('ECOMM_LEAD', admin, { revision: draft.revision, change_note: 'v2' });
    expect(published).toMatchObject({ version: 2, status: 'PUBLISHED', published_by: admin, change_note: 'v2' });
    expect((await leadQualityConfigService.published('ECOMM_LEAD')).version).toBe(2);
    const versions = await leadQualityConfigService.versions('ECOMM_LEAD');
    expect(versions.map((v) => [v.version, v.status])).toEqual([
      [2, 'PUBLISHED'],
      [1, 'ARCHIVED'],
    ]);
    expect(versions[1].archived_at).not.toBeNull();
    expect(await leadQualityConfigService.draft('ECOMM_LEAD')).toBeNull();
    expect(await LeadQualityEventModel.countDocuments({ kind: 'CONFIG_PUBLISH', entity_type: 'ECOMM_LEAD', config_version: 2 })).toBe(1);
  });

  it('refuses to publish a draft that changed after it was opened', async () => {
    const draft = await leadQualityConfigService.saveDraft('ECOMM_LEAD', config([100]), admin);
    await leadQualityConfigService.saveDraft('ECOMM_LEAD', config([100]), admin, { revision: draft.revision });
    await expect(leadQualityConfigService.publish('ECOMM_LEAD', admin, { revision: draft.revision })).rejects.toMatchObject({
      extensions: { code: 'CONFLICT' },
    });
  });
});

describe('draftFromVersion and discardDraft', () => {
  it('starts a draft from an older version (restore) and can throw it away', async () => {
    const original = await leadQualityConfigService.published('CREATOR_LEAD');
    const draft = await leadQualityConfigService.draftFromVersion('CREATOR_LEAD', 1, admin);
    expect(draft).toMatchObject({ status: 'DRAFT', version: 2, change_note: 'Started from version 1' });
    expect(draft.criteria).toEqual(original.criteria);
    expect(await leadQualityConfigService.discardDraft('CREATOR_LEAD', admin)).toBe(true);
    expect(await leadQualityConfigService.discardDraft('CREATOR_LEAD', admin)).toBe(false);
    expect((await leadQualityConfigService.published('CREATOR_LEAD')).version).toBe(1);
    expect(await LeadQualityEventModel.countDocuments({ kind: 'CONFIG_DISCARD', entity_type: 'CREATOR_LEAD' })).toBe(1);
  });

  it('says when the version does not exist', async () => {
    await expect(leadQualityConfigService.draftFromVersion('CREATOR_LEAD', 9, admin)).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
  });
});

describe('validate', () => {
  it('checks without saving', async () => {
    expect(leadQualityConfigService.validate(config([100]), 'PUBLISH')).toEqual([]);
    expect(leadQualityConfigService.validate(config([90]), 'PUBLISH').map((i) => i.code)).toEqual(['TOTAL_UNDER']);
    expect(await LeadQualityConfigModel.countDocuments({})).toBe(0);
  });
});
