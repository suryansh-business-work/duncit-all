import { addDays, cohortsOf, computeRetention, mondayOf } from '../../product/product.retention.calc';

const days = (...list: string[]) => new Set(list);

describe('addDays / mondayOf', () => {
  it('moves a day key across month ends and back', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('names the Monday on or before a day', () => {
    expect(mondayOf('2026-10-28')).toBe('2026-10-26'); // a Wednesday
    expect(mondayOf('2026-10-26')).toBe('2026-10-26'); // a Monday
    expect(mondayOf('2026-11-01')).toBe('2026-10-26'); // a Sunday
  });
});

describe('cohortsOf', () => {
  it('groups starters by their day, or by its Monday', () => {
    const starts = new Map([
      ['a', '2026-10-27'],
      ['b', '2026-10-28'],
      ['c', '2026-10-28'],
    ]);
    expect(cohortsOf(starts, 'DAY')).toEqual(new Map([['2026-10-27', ['a']], ['2026-10-28', ['b', 'c']]]));
    expect(cohortsOf(starts, 'WEEK')).toEqual(new Map([['2026-10-26', ['a', 'b', 'c']]]));
  });
});

describe('computeRetention — day cohorts', () => {
  const starts = new Map([
    ['a', '2026-10-01'],
    ['b', '2026-10-01'],
    ['c', '2026-10-02'],
  ]);
  const activity = new Map([
    ['a', days('2026-10-01', '2026-10-02', '2026-10-08')], // back on D1 and D7
    ['b', days('2026-10-01', '2026-10-03')], // back on D2 only: neither D1 nor D3
    ['c', days('2026-10-02', '2026-10-03', '2026-10-05')], // back on D1 and D3
  ]);

  it('counts classic day-N retention: active again exactly N days after starting', () => {
    const table = computeRetention(starts, activity, 'DAY', '2026-11-30');
    expect(table.offsets).toEqual([1, 3, 7, 14, 30]);
    expect(table.rows).toEqual([
      { cohort: '2026-10-01', size: 2, retained: [50, 0, 50, 0, 0] },
      { cohort: '2026-10-02', size: 1, retained: [100, 100, 0, 0, 0] },
    ]);
  });

  it('leaves a day that has not come yet empty — never a zero', () => {
    const table = computeRetention(starts, activity, 'DAY', '2026-10-08');
    expect(table.rows[0].retained).toEqual([50, 0, 50, null, null]);
    expect(table.rows[1].retained).toEqual([100, 100, null, null, null]);
  });

  it('averages each offset over the cohorts that reached it, weighted by size', () => {
    const table = computeRetention(starts, activity, 'DAY', '2026-10-08');
    // D1: (1 + 1) of (2 + 1); D7: only the first cohort has reached it.
    expect(table.average).toEqual([66.7, 33.3, 50, null, null]);
  });

  it('counts a person with no activity at all as not retained', () => {
    const table = computeRetention(new Map([['ghost', '2026-10-01']]), new Map(), 'DAY', '2026-12-01');
    expect(table.rows[0].retained).toEqual([0, 0, 0, 0, 0]);
  });
});

describe('computeRetention — week cohorts', () => {
  it('counts any activity in the Nth week after the cohort week', () => {
    const starts = new Map([
      ['a', '2026-10-28'],
      ['b', '2026-10-26'],
    ]);
    const activity = new Map([
      ['a', days('2026-10-28', '2026-11-08')], // the Sunday ending week 1
      ['b', days('2026-10-26', '2026-11-10')], // the Tuesday of week 2
    ]);
    const table = computeRetention(starts, activity, 'WEEK', '2026-11-12');
    expect(table.offsets).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(table.rows).toEqual([
      { cohort: '2026-10-26', size: 2, retained: [50, 50, null, null, null, null, null, null] },
    ]);
  });
});
