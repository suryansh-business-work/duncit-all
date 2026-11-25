import { describe, expect, it } from 'vitest';
import { DISCOVERY_LIMITS, leadDiscoveryDefaults, makeLeadDiscoverySchema, toLeadDiscoveryInput } from '../src/schemas';

/** Discover leads: the server's limits, with the key echoed so each assertion names the message shown. */
const schema = makeLeadDiscoverySchema((key) => key);
const messages = (input: object) => {
  const result = schema.safeParse({ ...leadDiscoveryDefaults, city: 'Pune', ...input });
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe('makeLeadDiscoverySchema', () => {
  it('needs a city of two letters or more, and accepts the defaults with one', () => {
    expect(messages({ city: 'P' })).toEqual(['crm.leadResearch.cityRequired']);
    expect(messages({})).toEqual([]);
  });

  it('keeps the target between 1 and 100 whole leads', () => {
    expect(messages({ target_count: 0 })).toEqual(['crm.leadResearch.targetRange']);
    expect(messages({ target_count: DISCOVERY_LIMITS.target.max + 1 })).toEqual(['crm.leadResearch.targetRange']);
    expect(messages({ target_count: 2.5 })).toEqual(['crm.leadResearch.targetRange']);
  });

  it('keeps a minimum score between 0 and 100, to hundredths, or none', () => {
    expect(messages({ min_score: 101 })).toEqual(['crm.leadResearch.minScoreRange']);
    expect(messages({ min_score: 70.125 })).toEqual(['crm.leadResearch.minScoreRange']);
    expect(messages({ min_score: 70.25 })).toEqual([]);
    expect(messages({ min_score: null })).toEqual([]);
  });

  it('caps places at 80 characters and keywords at 200', () => {
    expect(messages({ area: 'a'.repeat(81) })).toEqual(['crm.leadResearch.tooLong']);
    expect(messages({ keywords: 'k'.repeat(201) })).toEqual(['crm.leadResearch.tooLong']);
  });
});

describe('toLeadDiscoveryInput', () => {
  it('sends blank optional text as null and no sources, so the server picks the defaults', () => {
    expect(toLeadDiscoveryInput({ ...leadDiscoveryDefaults, city: 'Pune' })).toEqual({
      lead_type: 'VENUE_LEAD',
      city: 'Pune',
      locality: null,
      category: null,
      keywords: null,
      target_count: 20,
      min_score: null,
      sources: null,
      ai_evidence: true,
    });
  });

  it('sends what was filled in, sources included', () => {
    const input = toLeadDiscoveryInput({
      ...leadDiscoveryDefaults,
      city: 'Pune',
      area: 'Baner',
      category: 'Cafe',
      keywords: 'board games',
      min_score: 60,
      sources: ['INSTAGRAM'],
    });
    expect(input).toMatchObject({ locality: 'Baner', category: 'Cafe', keywords: 'board games', min_score: 60, sources: ['INSTAGRAM'] });
  });
});
