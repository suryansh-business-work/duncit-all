import {
  adjustmentSign,
  clampScore,
  healthBandColor,
  healthBandLabel,
  healthScoreCaption,
  HEALTH_BAND_COLOR,
  type HealthScoreLike,
} from '@/utils/health';

const score = (over: Partial<HealthScoreLike> = {}): HealthScoreLike => ({
  base_score: 100,
  delta_sum: 0,
  total_score: 100,
  band: 'GREEN',
  adjustments: [],
  ...over,
});

describe('healthBandColor / healthBandLabel', () => {
  it('maps known bands', () => {
    expect(healthBandColor('GREEN')).toBe(HEALTH_BAND_COLOR.GREEN);
    expect(healthBandLabel('RED')).toBe('Needs attention');
    expect(healthBandLabel('YELLOW')).toBe('Doing OK');
    expect(healthBandLabel('GREEN')).toBe('In great shape');
  });

  it('falls back for unknown bands', () => {
    expect(healthBandColor('PURPLE')).toBeDefined();
    expect(healthBandLabel('PURPLE')).toBe('Health');
  });
});

describe('clampScore', () => {
  it('clamps and rounds into 0–100', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(150)).toBe(100);
    expect(clampScore(72.6)).toBe(73);
  });
});

describe('adjustmentSign', () => {
  it('prefixes positive deltas with +', () => {
    expect(adjustmentSign(5)).toBe('+5');
    expect(adjustmentSign(-3)).toBe('-3');
    expect(adjustmentSign(0)).toBe('0');
  });
});

describe('healthScoreCaption', () => {
  it('omits the admin part when delta is zero', () => {
    expect(healthScoreCaption(score())).toBe('Base score: 100');
  });

  it('includes a signed admin adjustment', () => {
    expect(healthScoreCaption(score({ delta_sum: -10 }))).toBe(
      'Base score: 100 · Admin adjustment: -10',
    );
    expect(healthScoreCaption(score({ delta_sum: 5 }))).toBe(
      'Base score: 100 · Admin adjustment: +5',
    );
  });
});
