import {
  classify,
  enabledItems,
  qualityItems,
  scoreLead,
  slugKey,
  toHundredths,
  validateQualityConfig,
  weightageTotal,
  withKeys,
  type QualityBand,
  type QualityConfigBody,
  type QualityCriterion,
  type QualitySubCriterion,
} from '../../leadQuality.rules';

/**
 * The Lead Quality Score rules: what a valid configuration is (never over
 * 100%, exactly 100% to publish, sub-criteria adding up to their parent) and
 * how a lead's score, gates and qualification follow from its evidence.
 */

const BANDS: QualityBand[] = [
  { key: 'excellent', label: 'Excellent', min: 80, tone: 'success' },
  { key: 'good', label: 'Good', min: 60, tone: 'warning' },
  { key: 'moderate', label: 'Moderate', min: 40, tone: 'warning' },
  { key: 'low', label: 'Low', min: 0, tone: 'error' },
];

const sub = (key: string, points: number, extra: Partial<QualitySubCriterion> = {}): QualitySubCriterion => ({
  key,
  name: `Sub ${key}`,
  points,
  mandatory: false,
  auto_check: 'NONE',
  threshold: null,
  guidance: '',
  ...extra,
});

const criterion = (key: string, weightage: number, extra: Partial<QualityCriterion> = {}): QualityCriterion => ({
  key,
  name: `Criterion ${key}`,
  weightage,
  enabled: true,
  mandatory: false,
  auto_check: 'NONE',
  threshold: null,
  guidance: '',
  sub_criteria: [],
  ...extra,
});

const body = (criteria: QualityCriterion[], extra: Partial<QualityConfigBody> = {}): QualityConfigBody => ({
  criteria,
  min_qualification_score: null,
  bands: BANDS,
  ...extra,
});

const codes = (config: QualityConfigBody, mode: 'DRAFT' | 'PUBLISH') => validateQualityConfig(config, mode).map((i) => i.code);

describe('toHundredths', () => {
  it('reads numbers with up to two decimals as exact hundredths', () => {
    expect(toHundredths(20)).toBe(2000);
    expect(toHundredths(33.33)).toBe(3333);
    expect(toHundredths(0.1)).toBe(10);
    expect(toHundredths(0)).toBe(0);
  });

  it('refuses NaN, infinities, text and more than two decimals', () => {
    expect(toHundredths(Number.NaN)).toBeNull();
    expect(toHundredths(Number.POSITIVE_INFINITY)).toBeNull();
    expect(toHundredths('20')).toBeNull();
    expect(toHundredths(null)).toBeNull();
    expect(toHundredths(12.345)).toBeNull();
  });
});

describe('validateQualityConfig — totals', () => {
  it('accepts a configuration that totals exactly 100%', () => {
    expect(validateQualityConfig(body([criterion('a', 60), criterion('b', 40)]), 'PUBLISH')).toEqual([]);
  });

  it('refuses 105% in every mode with "Weightage cannot exceed 100%."', () => {
    const over = body([criterion('a', 60), criterion('b', 45)]);
    for (const mode of ['DRAFT', 'PUBLISH'] as const) {
      const [problem] = validateQualityConfig(over, mode);
      expect(problem).toMatchObject({ code: 'TOTAL_OVER', message: 'Weightage cannot exceed 100%.', amount: 5 });
    }
  });

  it('lets a draft stay at 95% but blocks publishing until the last 5% is allocated', () => {
    const under = body([criterion('a', 60), criterion('b', 35)]);
    expect(validateQualityConfig(under, 'DRAFT')).toEqual([]);
    expect(validateQualityConfig(under, 'PUBLISH')).toEqual([
      expect.objectContaining({ code: 'TOTAL_UNDER', message: 'Allocate the remaining 5% before publishing.', amount: 5 }),
    ]);
  });

  it('counts only enabled criteria towards the total', () => {
    const config = body([criterion('a', 100), criterion('b', 30, { enabled: false })]);
    expect(validateQualityConfig(config, 'PUBLISH')).toEqual([]);
    expect(weightageTotal(config.criteria)).toBe(100);
  });

  it('adds decimals exactly: 33.33 + 33.33 + 33.34 is 100', () => {
    const config = body([criterion('a', 33.33), criterion('b', 33.33), criterion('c', 33.34)]);
    expect(validateQualityConfig(config, 'PUBLISH')).toEqual([]);
    expect(weightageTotal(config.criteria)).toBe(100);
  });

  it('needs at least one enabled criterion to publish', () => {
    expect(codes(body([criterion('a', 100, { enabled: false })]), 'PUBLISH')).toContain('NO_CRITERIA');
  });
});

describe('validateQualityConfig — values', () => {
  it.each([
    ['a negative weightage', -5, 'OUT_OF_RANGE'],
    ['a weightage over 100', 101, 'OUT_OF_RANGE'],
    ['NaN', Number.NaN, 'NOT_A_NUMBER'],
    ['three decimals', 10.005, 'TOO_MANY_DECIMALS'],
  ])('refuses %s', (_label, value, code) => {
    expect(codes(body([criterion('a', value)]), 'DRAFT')).toContain(code);
  });

  it('does not report a total when a weightage cannot be read', () => {
    expect(codes(body([criterion('a', Number.NaN), criterion('b', 100)]), 'PUBLISH')).not.toContain('TOTAL_UNDER');
  });

  it('requires names and valid, unique keys', () => {
    const config = body([criterion('a', 50, { name: '  ' }), criterion('a', 25), criterion('Bad Key', 25)]);
    expect(codes(config, 'DRAFT')).toEqual(expect.arrayContaining(['NAME_REQUIRED', 'KEY_DUPLICATE', 'KEY_INVALID']));
  });

  it('caps names at 80 characters', () => {
    expect(codes(body([criterion('a', 100, { name: 'x'.repeat(81) })]), 'DRAFT')).toContain('NAME_TOO_LONG');
  });

  it('refuses more than 30 criteria', () => {
    const many = Array.from({ length: 31 }, (_v, i) => criterion(`c${i}`, i === 0 ? 100 : 0));
    expect(codes(body(many), 'DRAFT')).toContain('TOO_MANY');
  });

  it('checks the minimum qualifying score is 0-100', () => {
    expect(codes(body([criterion('a', 100)], { min_qualification_score: 120 }), 'DRAFT')).toContain('OUT_OF_RANGE');
    expect(validateQualityConfig(body([criterion('a', 100)], { min_qualification_score: 61 }), 'PUBLISH')).toEqual([]);
  });
});

describe('validateQualityConfig — sub-criteria', () => {
  it('accepts sub-criteria that add up to their criterion', () => {
    const config = body([criterion('ig', 20, { sub_criteria: [sub('a', 10), sub('b', 5), sub('c', 5)] }), criterion('rest', 80)]);
    expect(validateQualityConfig(config, 'PUBLISH')).toEqual([]);
  });

  it('refuses sub-criteria worth more than the criterion, even in a draft', () => {
    const config = body([criterion('ig', 20, { sub_criteria: [sub('a', 15), sub('b', 10)] }), criterion('rest', 80)]);
    const [problem] = validateQualityConfig(config, 'DRAFT');
    expect(problem).toMatchObject({ code: 'SUB_SUM_OVER', amount: 5, path: 'criteria.0.sub_criteria' });
  });

  it('lets a draft leave points unallocated but not a published version', () => {
    const config = body([criterion('ig', 20, { sub_criteria: [sub('a', 10)] }), criterion('rest', 80)]);
    expect(validateQualityConfig(config, 'DRAFT')).toEqual([]);
    expect(validateQualityConfig(config, 'PUBLISH')).toEqual([expect.objectContaining({ code: 'SUB_SUM_MISMATCH', amount: 10 })]);
  });

  it('refuses an automatic check on a criterion that has sub-criteria', () => {
    const config = body([criterion('ig', 100, { auto_check: 'CRM_UNIQUENESS', sub_criteria: [sub('a', 100)] })]);
    expect(codes(config, 'DRAFT')).toContain('PARENT_AUTO_CHECK');
  });

  it('refuses duplicate sub-criterion keys and more than 12 sub-criteria', () => {
    const dupes = body([criterion('ig', 100, { sub_criteria: [sub('a', 50), sub('a', 50)] })]);
    expect(codes(dupes, 'DRAFT')).toContain('KEY_DUPLICATE');
    const many = body([criterion('ig', 100, { sub_criteria: Array.from({ length: 13 }, (_v, i) => sub(`s${i}`, i === 0 ? 100 : 0)) })]);
    expect(codes(many, 'DRAFT')).toContain('TOO_MANY');
  });
});

describe('validateQualityConfig — automatic checks and bands', () => {
  it('needs a whole-number threshold for the follower, recent-post and review checks', () => {
    expect(codes(body([criterion('f', 100, { auto_check: 'INSTAGRAM_FOLLOWERS_MIN' })]), 'DRAFT')).toContain('THRESHOLD_REQUIRED');
    expect(codes(body([criterion('f', 100, { auto_check: 'INSTAGRAM_FOLLOWERS_MIN', threshold: 1.5 })]), 'DRAFT')).toContain('THRESHOLD_REQUIRED');
    expect(validateQualityConfig(body([criterion('f', 100, { auto_check: 'INSTAGRAM_FOLLOWERS_MIN', threshold: 1000 })]), 'PUBLISH')).toEqual([]);
  });

  it('refuses a threshold on a check that takes none, and an unknown check', () => {
    expect(codes(body([criterion('u', 100, { auto_check: 'CRM_UNIQUENESS', threshold: 5 })]), 'DRAFT')).toContain('THRESHOLD_UNUSED');
    expect(codes(body([criterion('u', 100, { auto_check: 'SCRAPE_EVERYTHING' as never })]), 'DRAFT')).toContain('AUTO_CHECK_INVALID');
  });

  it('needs a band starting at 0, unique band starts and a known tone', () => {
    const noZero = body([criterion('a', 100)], { bands: [{ key: 'hi', label: 'High', min: 50, tone: 'success' }] });
    expect(codes(noZero, 'DRAFT')).toContain('BAND_ZERO_MISSING');
    const clash = body([criterion('a', 100)], {
      bands: [
        { key: 'a', label: 'A', min: 0, tone: 'error' },
        { key: 'b', label: 'B', min: 0, tone: 'purple' as never },
      ],
    });
    expect(codes(clash, 'DRAFT')).toEqual(expect.arrayContaining(['KEY_DUPLICATE', 'BAND_TONE_INVALID']));
  });
});

describe('withKeys and slugKey', () => {
  it('makes keys from names and keeps the ones given', () => {
    const keyed = withKeys(
      body([
        criterion('', 50, { name: 'Instagram Verification', sub_criteria: [sub('', 50, { name: 'Authentic Profile' })] }),
        criterion('kept', 50),
      ])
    );
    expect(keyed.criteria.map((c) => c.key)).toEqual(['instagram_verification', 'kept']);
    expect(keyed.criteria[0].sub_criteria[0].key).toBe('authentic_profile');
  });

  it('never gives two criteria the same key', () => {
    const keyed = withKeys(body([criterion('', 50, { name: 'Contact' }), criterion('', 50, { name: 'Contact!' })]));
    expect(keyed.criteria.map((c) => c.key)).toEqual(['contact', 'contact_2']);
  });

  it('slugs names to lowercase words joined by underscores', () => {
    expect(slugKey('  Venue Identity & Operational Status ')).toBe('venue_identity_operational_status');
    expect(slugKey('!!!')).toBe('');
  });
});

describe('qualityItems', () => {
  it('scores a criterion without sub-criteria as one item worth its weightage', () => {
    expect(qualityItems(criterion('maps', 5, { auto_check: 'GOOGLE_MAPS_LISTING' }))).toEqual([
      expect.objectContaining({ key: 'maps', sub_key: null, points: 500, auto_check: 'GOOGLE_MAPS_LISTING', mandatory: false }),
    ]);
  });

  it('keys sub-criteria as criterion.sub and lists only enabled criteria', () => {
    const config = body([criterion('ig', 20, { sub_criteria: [sub('a', 20)] }), criterion('off', 80, { enabled: false })]);
    expect(enabledItems(config).map((i) => i.key)).toEqual(['ig.a']);
  });
});

describe('scoreLead', () => {
  const venueLike = body(
    [
      criterion('instagram', 20, { sub_criteria: [sub('authentic', 10, { mandatory: true }), sub('outlet', 5), sub('recent', 5)] }),
      criterion('contact', 20, { mandatory: true, sub_criteria: [sub('phone', 8), sub('whatsapp', 5), sub('email', 4), sub('booking', 3)] }),
      criterion('maps', 10),
      criterion('dedup', 50, { mandatory: true }),
    ],
    { min_qualification_score: 61 }
  );

  it('earns points only for verified items and leaves unknown ones pending', () => {
    const result = scoreLead(venueLike, { 'instagram.authentic': 'VERIFIED', 'contact.phone': 'VERIFIED', 'contact.email': 'FAILED', dedup: 'VERIFIED' });
    expect(result.score).toBe(68);
    expect(result.criteria.map((c) => [c.key, c.earned, c.max, c.status])).toEqual([
      ['instagram', 10, 20, 'PARTIAL'],
      ['contact', 8, 20, 'PARTIAL'],
      ['maps', 0, 10, 'PENDING'],
      ['dedup', 50, 50, 'VERIFIED'],
    ]);
    // Pending: outlet 5 + recent 5 + whatsapp 5 + booking 3 + maps 10 = 28 more within reach.
    expect(result).toMatchObject({ verified_items: 3, failed_items: 1, pending_items: 5, potential_score: 96, max_score: 100 });
  });

  it('qualifies when every gate passes and the minimum score is met', () => {
    const result = scoreLead(venueLike, { 'instagram.authentic': 'VERIFIED', 'contact.phone': 'VERIFIED', dedup: 'VERIFIED' });
    expect(result.gates).toEqual([
      { key: 'instagram.authentic', name: 'Criterion instagram › Sub authentic', state: 'PASSED' },
      { key: 'contact', name: 'Criterion contact', state: 'PASSED' },
      { key: 'dedup', name: 'Criterion dedup', state: 'PASSED' },
    ]);
    expect(result.qualification).toBe('QUALIFIED');
  });

  it('is pending verification while a gate is still unverified', () => {
    const result = scoreLead(venueLike, { 'instagram.authentic': 'VERIFIED', dedup: 'VERIFIED', maps: 'VERIFIED' });
    expect(result.gates.find((g) => g.key === 'contact')?.state).toBe('PENDING');
    expect(result.qualification).toBe('PENDING_VERIFICATION');
  });

  it('is not qualified once a gate fails, whatever the score', () => {
    const result = scoreLead(venueLike, { 'instagram.authentic': 'VERIFIED', 'contact.phone': 'VERIFIED', maps: 'VERIFIED', dedup: 'FAILED' });
    expect(result.gates.find((g) => g.key === 'dedup')?.state).toBe('FAILED');
    expect(result.qualification).toBe('NOT_QUALIFIED');
  });

  it('fails a criterion gate only when every one of its items failed', () => {
    const allFailed = { 'contact.phone': 'FAILED', 'contact.whatsapp': 'FAILED', 'contact.email': 'FAILED', 'contact.booking': 'FAILED' } as const;
    expect(scoreLead(venueLike, allFailed).gates.find((g) => g.key === 'contact')?.state).toBe('FAILED');
    expect(scoreLead(venueLike, allFailed).criteria.find((c) => c.key === 'contact')?.status).toBe('FAILED');
  });

  it('is not qualified when even verifying everything pending could not reach the minimum', () => {
    const result = scoreLead(venueLike, {
      'instagram.authentic': 'VERIFIED',
      'contact.phone': 'VERIFIED',
      dedup: 'FAILED',
    });
    expect(result.qualification).toBe('NOT_QUALIFIED');
    const short = scoreLead(body([criterion('a', 50), criterion('b', 50)], { min_qualification_score: 61 }), { a: 'VERIFIED', b: 'FAILED' });
    expect(short.potential_score).toBe(50);
    expect(short.qualification).toBe('NOT_QUALIFIED');
  });

  it('qualifies a lead on its gates alone when there is no minimum score (a verified Host)', () => {
    const host = body([criterion('evidence', 15, { mandatory: true }), criterion('rest', 85)], { min_qualification_score: null });
    const result = scoreLead(host, { evidence: 'VERIFIED' });
    expect(result.score).toBe(15);
    expect(result.qualification).toBe('QUALIFIED');
  });

  it('classifies by band and colours by the band tone', () => {
    const config = body([criterion('a', 82), criterion('b', 18)]);
    expect(scoreLead(config, { a: 'VERIFIED' })).toMatchObject({ score: 82, classification: 'excellent', classification_label: 'Excellent', tone: 'success' });
    expect(scoreLead(config, { b: 'VERIFIED' })).toMatchObject({ score: 18, classification: 'low', tone: 'error' });
  });

  it('reports verification progress: pending, in progress, complete', () => {
    const config = body([criterion('a', 50), criterion('b', 50)]);
    expect(scoreLead(config, {}).verification).toBe('PENDING');
    expect(scoreLead(config, { a: 'VERIFIED' }).verification).toBe('IN_PROGRESS');
    expect(scoreLead(config, { a: 'VERIFIED', b: 'FAILED' }).verification).toBe('COMPLETE');
  });

  it('never goes past 100 and refuses a configuration that could', () => {
    const exact = body([criterion('a', 33.33), criterion('b', 33.33), criterion('c', 33.34)]);
    expect(scoreLead(exact, { a: 'VERIFIED', b: 'VERIFIED', c: 'VERIFIED' }).score).toBe(100);
    const over = body([criterion('a', 70), criterion('b', 40)]);
    expect(() => scoreLead(over, {})).toThrow(RangeError);
  });

  it('ignores evidence for items that are not in the configuration', () => {
    expect(scoreLead(body([criterion('a', 100)]), { ghost: 'VERIFIED' }).score).toBe(0);
  });
});

describe('classify', () => {
  it('picks the highest band starting at or below the score', () => {
    expect(classify(80, BANDS)?.key).toBe('excellent');
    expect(classify(79.99, BANDS)?.key).toBe('good');
    expect(classify(0, BANDS)?.key).toBe('low');
    expect(classify(10, [])).toBeNull();
  });
});
