import { DEFAULT_QUALITY_CONFIGS } from '../../leadQuality.defaults';
import { QUALITY_LEAD_TYPES, scoreLead, validateQualityConfig, weightageTotal } from '../../leadQuality.rules';

/**
 * The scoring model each lead type starts with must itself be publishable:
 * exactly 100%, every sub-criterion set adding up to its criterion, and the
 * mandatory gates the brief names for Host and Venue (V3).
 */

const gateNames = (type: (typeof QUALITY_LEAD_TYPES)[number]) => scoreLead(DEFAULT_QUALITY_CONFIGS[type], {}).gates.map((g) => g.name);

describe('DEFAULT_QUALITY_CONFIGS', () => {
  it.each(QUALITY_LEAD_TYPES)('%s publishes without a single issue and totals 100', (type) => {
    const config = DEFAULT_QUALITY_CONFIGS[type];
    expect(validateQualityConfig(config, 'PUBLISH')).toEqual([]);
    expect(weightageTotal(config.criteria)).toBe(100);
  });

  it.each(QUALITY_LEAD_TYPES)('%s scores 0/100 and is not qualified with no evidence', (type) => {
    const result = scoreLead(DEFAULT_QUALITY_CONFIGS[type], {});
    expect(result.score).toBe(0);
    expect(result.qualification).toBe('PENDING_VERIFICATION');
    expect(result.potential_score).toBe(100);
  });

  it('keeps the Venue V3 minimum of 61 and its gates: Instagram, contact channel, address, operating, event suitability, uniqueness', () => {
    expect(DEFAULT_QUALITY_CONFIGS.VENUE_LEAD.min_qualification_score).toBe(61);
    expect(gateNames('VENUE_LEAD')).toEqual([
      'Instagram Verification › Authentic Instagram profile',
      'Contact Verification',
      'Venue Identity and Operational Status › Exact address confirmed',
      'Venue Identity and Operational Status › Currently operating',
      'Event Hosting Evidence',
      'CRM Deduplication',
    ]);
  });

  it('lets a verified Host qualify on its gates alone: Instagram identity, event evidence, target city, uniqueness', () => {
    expect(DEFAULT_QUALITY_CONFIGS.HOST_LEAD.min_qualification_score).toBeNull();
    expect(gateNames('HOST_LEAD')).toEqual([
      'Relevant Workshop/Event Reels + Local Hashtags › Authentic Instagram profile',
      'CRM Uniqueness',
      'Previous Hosting Evidence',
      'Target-City Verification',
    ]);
    const gatesOnly = scoreLead(DEFAULT_QUALITY_CONFIGS.HOST_LEAD, {
      'reels_hashtags.authentic_profile': 'VERIFIED',
      crm_uniqueness: 'VERIFIED',
      'hosting_evidence.past_event_posts': 'VERIFIED',
      target_city: 'VERIFIED',
    });
    // 6 (profile) + 5 (uniqueness) + 8 (past events) + 10 (target city).
    expect(gatesOnly.score).toBe(29);
    expect(gatesOnly.qualification).toBe('QUALIFIED');
  });

  it('proposes 60 as the qualifying minimum for Community, Creator and E-commerce', () => {
    for (const type of ['COMMUNITY_LEAD', 'CREATOR_LEAD', 'ECOMM_LEAD'] as const) {
      expect(DEFAULT_QUALITY_CONFIGS[type].min_qualification_score).toBe(60);
    }
  });

  it('makes CRM uniqueness an automatic, mandatory check in every model', () => {
    for (const type of QUALITY_LEAD_TYPES) {
      const unique = DEFAULT_QUALITY_CONFIGS[type].criteria.filter((c) => c.auto_check === 'CRM_UNIQUENESS');
      expect(unique).toHaveLength(1);
      expect(unique[0].mandatory).toBe(true);
    }
  });

  it('colours scores red below 40, yellow from 40 and green from 80', () => {
    const tones = DEFAULT_QUALITY_CONFIGS.VENUE_LEAD.bands.map((b) => [b.min, b.tone]);
    expect(tones).toEqual([
      [80, 'success'],
      [60, 'warning'],
      [40, 'warning'],
      [20, 'error'],
      [0, 'error'],
    ]);
  });
});
