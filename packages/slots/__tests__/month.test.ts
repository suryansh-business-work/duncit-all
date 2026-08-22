import { describe, expect, it } from 'vitest';

import { addMonths, buildMonthGrid, clampMonth, monthKeyOf, weekdayIndex, weekdayInitials } from '../src/month';

describe('monthKeyOf', () => {
  it('takes the month out of a day key', () => {
    expect(monthKeyOf('2026-08-10')).toBe('2026-08');
  });

  it('leaves a month key alone', () => {
    expect(monthKeyOf('2026-08')).toBe('2026-08');
  });
});

describe('addMonths', () => {
  it('walks forward and back inside a year', () => {
    expect(addMonths('2026-08', 1)).toBe('2026-09');
    expect(addMonths('2026-08', -1)).toBe('2026-07');
    expect(addMonths('2026-08', 0)).toBe('2026-08');
  });

  it('rolls over the year boundary in both directions', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('handles a multi-year jump', () => {
    expect(addMonths('2026-08', 30)).toBe('2029-02');
    expect(addMonths('2026-08', -20)).toBe('2024-12');
  });
});

describe('weekdayIndex', () => {
  it('starts the grid on Monday', () => {
    // 2026-08-10 is a Monday; 2026-08-16 is the Sunday that ends that week.
    expect(weekdayIndex('2026-08-10')).toBe(0);
    expect(weekdayIndex('2026-08-15')).toBe(5);
    expect(weekdayIndex('2026-08-16')).toBe(6);
  });
});

describe('buildMonthGrid', () => {
  const flat = (monthKey: string) => buildMonthGrid(monthKey).flat();

  it('lays a month out in whole weeks of seven', () => {
    for (const week of buildMonthGrid('2026-08')) expect(week).toHaveLength(7);
  });

  it('blanks the cells before the first and after the last, so no neighbouring day looks clickable', () => {
    const weeks = buildMonthGrid('2026-08'); // 1 Aug 2026 is a Saturday

    expect(weeks[0]).toEqual([null, null, null, null, null, '2026-08-01', '2026-08-02']);
    expect(weeks.at(-1)?.filter(Boolean)).toEqual(['2026-08-31']);
  });

  it('holds every day of the month exactly once, in order', () => {
    const days = flat('2026-08').filter(Boolean);

    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2026-08-01');
    expect(days.at(-1)).toBe('2026-08-31');
    expect([...days].sort((a, b) => String(a).localeCompare(String(b)))).toEqual(days);
  });

  it('zero-pads single-digit days so the keys sort as strings', () => {
    expect(flat('2026-08')).toContain('2026-08-09');
  });

  it('knows the short months and the leap year', () => {
    expect(flat('2026-02').filter(Boolean)).toHaveLength(28);
    expect(flat('2024-02').filter(Boolean)).toHaveLength(29);
    expect(flat('2026-04').filter(Boolean)).toHaveLength(30);
  });

  it('needs no trailing blanks when a month ends on a Sunday', () => {
    // February 2027 starts on a Monday and has 28 days — exactly four weeks.
    const weeks = buildMonthGrid('2027-02');

    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every(Boolean)).toBe(true);
  });
});

describe('weekdayInitials', () => {
  it('runs Monday-first and gives each column a stable id, because the initials repeat', () => {
    const fmt = { formatPattern: (d: Date, _p: string) => String(d.getUTCDate()) };

    expect(weekdayInitials(fmt)).toEqual([
      { id: 'mon', label: '1' },
      { id: 'tue', label: '2' },
      { id: 'wed', label: '3' },
      { id: 'thu', label: '4' },
      { id: 'fri', label: '5' },
      { id: 'sat', label: '6' },
      { id: 'sun', label: '7' },
    ]);
  });

  it('asks the formatter for the locale initial rather than hardcoding one', () => {
    const seen: string[] = [];
    weekdayInitials({
      formatPattern: (_d, pattern) => {
        seen.push(pattern);
        return 'X';
      },
    });

    expect(new Set(seen)).toEqual(new Set(['EEEEE']));
  });
});

describe('clampMonth', () => {
  it('bounds the arrows to the months that can hold a slot', () => {
    expect(clampMonth('2026-06', '2026-08', '2026-10')).toBe('2026-08');
    expect(clampMonth('2026-12', '2026-08', '2026-10')).toBe('2026-10');
    expect(clampMonth('2026-09', '2026-08', '2026-10')).toBe('2026-09');
  });

  it('leaves the bounds themselves alone', () => {
    expect(clampMonth('2026-08', '2026-08', '2026-10')).toBe('2026-08');
    expect(clampMonth('2026-10', '2026-08', '2026-10')).toBe('2026-10');
  });
});
