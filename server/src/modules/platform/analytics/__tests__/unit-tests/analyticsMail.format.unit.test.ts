import { formatAnalyticsValue, formatCell, kpiDelta } from '../../mail/analyticsMail.format';
import type { ReportCopy } from '../../mail/analyticsMail.copy';
import type { AnalyticsKpi } from '../../entity/shapes';

/** Echoes the key and its variables so a test can see which words the report chose. */
const copy: ReportCopy = {
  locale: 'en',
  t: (key, vars) => (vars ? `${key}(${Object.values(vars).join(',')})` : key),
};

const kpi = (over: Partial<AnalyticsKpi>): AnalyticsKpi => ({
  key: 'pods',
  value: 110,
  previous: 100,
  format: 'COUNT',
  higher_is_better: true,
  ...over,
});

describe('formatAnalyticsValue', () => {
  it('writes a missing value as an em dash', () => {
    expect(formatAnalyticsValue(null, 'COUNT', 'Rs')).toBe('—');
    expect(formatAnalyticsValue(undefined, 'USD', 'Rs')).toBe('—');
  });

  it('writes counts, money, percents and decimals the way the console does', () => {
    expect(formatAnalyticsValue(1234567, 'COUNT', 'Rs')).toBe('12,34,567');
    expect(formatAnalyticsValue(1234.6, 'CURRENCY', 'Rs')).toBe('Rs1,235');
    expect(formatAnalyticsValue(12.34, 'PERCENT', 'Rs')).toBe('12.3%');
    expect(formatAnalyticsValue(3.46, 'DAYS', 'Rs')).toBe('3.5');
    expect(formatAnalyticsValue(3.46, 'DECIMAL', 'Rs')).toBe('3.5');
  });

  it('writes a rating to one place, and an unrated tile as a dash', () => {
    expect(formatAnalyticsValue(4.26, 'RATING', 'Rs')).toBe('4.3');
    expect(formatAnalyticsValue(0, 'RATING', 'Rs')).toBe('—');
  });

  it('writes bytes in the largest unit with fewer digits as it grows', () => {
    expect(formatAnalyticsValue(0, 'BYTES', 'Rs')).toBe('0 B');
    expect(formatAnalyticsValue(-5, 'BYTES', 'Rs')).toBe('0 B');
    expect(formatAnalyticsValue(512, 'BYTES', 'Rs')).toBe('512 B');
    expect(formatAnalyticsValue(1536, 'BYTES', 'Rs')).toBe('1.5 KB');
    expect(formatAnalyticsValue(15 * 1024, 'BYTES', 'Rs')).toBe('15 KB');
    expect(formatAnalyticsValue(150 * 1024 ** 2, 'BYTES', 'Rs')).toBe('150 MB');
    expect(formatAnalyticsValue(10 * 1024 ** 5, 'BYTES', 'Rs')).toBe('10 PB');
  });

  it('writes durations in ms, seconds or minutes', () => {
    expect(formatAnalyticsValue(850, 'DURATION', 'Rs')).toMatch(/^850\s?ms$/);
    expect(formatAnalyticsValue(12_400, 'DURATION', 'Rs')).toMatch(/^12\.4\s?secs?$/);
    expect(formatAnalyticsValue(90_000, 'DURATION', 'Rs')).toMatch(/^1\.5\s?mins?$/);
    expect(formatAnalyticsValue(0.4, 'DURATION', 'Rs')).toMatch(/ms$/);
  });

  it('writes a grade as a letter, and nothing below 1 as a dash', () => {
    expect(formatAnalyticsValue(1, 'GRADE', 'Rs')).toBe('A');
    expect(formatAnalyticsValue(3, 'GRADE', 'Rs')).toBe('C');
    expect(formatAnalyticsValue(0, 'GRADE', 'Rs')).toBe('—');
  });

  it('writes dollars to the cent, and to a hundredth of a cent under a dollar', () => {
    expect(formatAnalyticsValue(12.5, 'USD', 'Rs')).toBe('$12.50');
    expect(formatAnalyticsValue(0.01234, 'USD', 'Rs')).toBe('$0.0123');
  });

  it('falls back to a count for OUTCOME values', () => {
    expect(formatAnalyticsValue(1, 'OUTCOME', 'Rs')).toBe('1');
  });
});

describe('formatCell', () => {
  it('words an outcome: passed, failed, untested', () => {
    expect(formatCell(1, 'OUTCOME', 'Rs', copy)).toBe('analytics.outcome.passed');
    expect(formatCell(0, 'OUTCOME', 'Rs', copy)).toBe('analytics.outcome.failed');
    expect(formatCell(null, 'OUTCOME', 'Rs', copy)).toBe('analytics.outcome.untested');
    expect(formatCell(undefined, 'OUTCOME', 'Rs', copy)).toBe('analytics.outcome.untested');
  });

  it('writes any other format as a value', () => {
    expect(formatCell(5, 'PERCENT', 'Rs', copy)).toBe('5%');
  });
});

describe('kpiDelta', () => {
  it('says "right now" for a live count, with no tone', () => {
    expect(kpiDelta(kpi({ previous: null }), 30, copy)).toEqual({ text: 'analytics.page.liveCount', tone: null });
  });

  it('calls a sub-0.05 move flat', () => {
    const d = kpiDelta(kpi({ value: 100.02, previous: 100 }), 30, copy);
    expect(d.tone).toBe('flat');
    expect(d.text).toBe('analytics.page.noChange analytics.page.vsPrevious(30)');
  });

  it('reports a rise as a percent and good when higher is better', () => {
    const d = kpiDelta(kpi({ value: 110, previous: 100 }), 7, copy);
    expect(d).toEqual({ text: 'analytics.page.deltaPercent(+10) analytics.page.vsPrevious(7)', tone: 'good' });
  });

  it('reports a rise as bad when lower is better, and a fall with a minus sign', () => {
    expect(kpiDelta(kpi({ value: 110, previous: 100, higher_is_better: false }), 7, copy).tone).toBe('bad');
    const fall = kpiDelta(kpi({ value: 90, previous: 100, higher_is_better: false }), 7, copy);
    expect(fall.text).toContain('deltaPercent(-10)');
    expect(fall.tone).toBe('good');
  });

  it('writes a percent tile as points', () => {
    const d = kpiDelta(kpi({ format: 'PERCENT', value: 55, previous: 50 }), 7, copy);
    expect(d.text).toContain('analytics.page.deltaPoints(+5)');
  });

  it('writes a change from zero, and a grade change, as a plain difference', () => {
    expect(kpiDelta(kpi({ value: 4, previous: 0 }), 7, copy).text.startsWith('+4 ')).toBe(true);
    expect(kpiDelta(kpi({ format: 'GRADE', value: 2, previous: 3 }), 7, copy).text.startsWith('-1 ')).toBe(true);
  });
});
