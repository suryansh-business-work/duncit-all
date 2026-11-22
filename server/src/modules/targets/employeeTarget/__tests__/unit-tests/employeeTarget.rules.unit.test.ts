import {
  EMPLOYEE_TARGET_LIMITS,
  assignSchema,
  canEditGoals,
  canReopen,
  canReview,
  canSubmit,
  clampSetting,
  daysInMonth,
  parseDayKey,
  parseInput,
  parseMonthKey,
  reminderMonthsFor,
  submitSchema,
  windowEndDayKey,
} from '../../employeeTarget.rules';

const WINDOW = { enabled: true, daysBeforeEnd: 3, graceDays: 3 };

/** The error a call throws — failing the test when it does not throw at all. */
function refusal(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  throw new Error('expected the call to be refused');
}

describe('month and day keys', () => {
  it('accepts only real YYYY-MM months inside the supported years', () => {
    expect(parseMonthKey('2026-11')).toEqual({ year: 2026, month: 11 });
    for (const bad of ['2026-13', '2026-00', '2026-1', '26-11', '2026/11', '1999-12', '2101-01', 'abcd-ef', null, 202611]) {
      expect(parseMonthKey(bad)).toBeNull();
    }
  });

  it('knows month lengths, including leap February', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2100, 2)).toBe(28);
    expect(daysInMonth(2026, 12)).toBe(31);
    expect(parseDayKey('2028-02-29')).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseDayKey('2026-02-29')).toBeNull();
    expect(parseDayKey('2026-11-1')).toBeNull();
  });
});

describe('reminderMonthsFor', () => {
  it('opens on the month’s last N days and stays shut before them', () => {
    expect(reminderMonthsFor('2026-11-27', WINDOW)).toEqual([]);
    expect(reminderMonthsFor('2026-11-28', WINDOW)).toEqual(['2026-11']);
    expect(reminderMonthsFor('2026-11-30', WINDOW)).toEqual(['2026-11']);
  });

  it('keeps reminding for the month just closed during the grace days, across a year boundary', () => {
    expect(reminderMonthsFor('2027-01-01', WINDOW)).toEqual(['2026-12']);
    expect(reminderMonthsFor('2027-01-03', WINDOW)).toEqual(['2026-12']);
    expect(reminderMonthsFor('2027-01-04', WINDOW)).toEqual([]);
  });

  it('follows February’s real length in leap and common years', () => {
    expect(reminderMonthsFor('2028-02-26', WINDOW)).toEqual([]);
    expect(reminderMonthsFor('2028-02-27', WINDOW)).toEqual(['2028-02']);
    expect(reminderMonthsFor('2026-02-26', WINDOW)).toEqual(['2026-02']);
  });

  it('can have two months due at once when the windows overlap, and none when switched off or with grace 0', () => {
    expect(reminderMonthsFor('2026-02-14', { enabled: true, daysBeforeEnd: 15, graceDays: 15 })).toEqual([
      '2026-02',
      '2026-01',
    ]);
    expect(reminderMonthsFor('2026-11-30', { ...WINDOW, enabled: false })).toEqual([]);
    expect(reminderMonthsFor('2026-12-01', { ...WINDOW, graceDays: 0 })).toEqual([]);
    expect(reminderMonthsFor('2026-11-30', { ...WINDOW, daysBeforeEnd: 1 })).toEqual(['2026-11']);
    expect(reminderMonthsFor('2026-11-29', { ...WINDOW, daysBeforeEnd: 1 })).toEqual([]);
    expect(reminderMonthsFor('not-a-day', WINDOW)).toEqual([]);
  });
});

describe('windowEndDayKey', () => {
  it('is the last grace day of the next month, or the month’s own last day without grace', () => {
    expect(windowEndDayKey('2026-11', { graceDays: 3 })).toBe('2026-12-03');
    expect(windowEndDayKey('2026-12', { graceDays: 5 })).toBe('2027-01-05');
    expect(windowEndDayKey('2028-02', { graceDays: 0 })).toBe('2028-02-29');
    expect(windowEndDayKey('bad', { graceDays: 3 })).toBeNull();
  });
});

describe('clampSetting', () => {
  it('holds a value inside its bounds and keeps the current one for junk', () => {
    expect(clampSetting('daysBeforeEnd', 0, 3)).toBe(1);
    expect(clampSetting('daysBeforeEnd', 99, 3)).toBe(15);
    expect(clampSetting('daysBeforeEnd', 4.7, 3)).toBe(4);
    expect(clampSetting('graceDays', 0, 3)).toBe(0);
    expect(clampSetting('graceDays', 'x', 2)).toBe(2);
    expect(clampSetting('graceDays', null, 2)).toBe(2);
    expect(clampSetting('graceDays', undefined, 2)).toBe(2);
  });
});

describe('status transitions', () => {
  it('lets goals change only before a report, reports until review, review only after a report', () => {
    expect([canEditGoals('ASSIGNED'), canEditGoals('SUBMITTED'), canEditGoals('REVIEWED')]).toEqual([true, false, false]);
    expect([canSubmit('ASSIGNED'), canSubmit('SUBMITTED'), canSubmit('REVIEWED')]).toEqual([true, true, false]);
    expect([canReview('ASSIGNED'), canReview('SUBMITTED'), canReview('REVIEWED')]).toEqual([false, true, false]);
    expect([canReopen('ASSIGNED'), canReopen('SUBMITTED'), canReopen('REVIEWED')]).toEqual([false, false, true]);
  });
});

describe('submission input', () => {
  const valid = { completion_percent: 70, achievements: [{ title: 'Closed 12 venues' }], expected_revision: 0 };

  it('accepts 0 and 100, trims rows and fills optional text with blanks', () => {
    expect(parseInput(submitSchema, { ...valid, completion_percent: 0 }).completion_percent).toBe(0);
    const parsed = parseInput(submitSchema, {
      ...valid,
      completion_percent: 100,
      achievements: [{ title: '  Closed 12 venues ', details: null }],
    });
    expect(parsed).toEqual({
      completion_percent: 100,
      achievements: [{ title: 'Closed 12 venues', details: '' }],
      updates: '',
      expected_revision: 0,
    });
  });

  it('refuses a percent outside 0–100 or with decimals, and an empty achievement list or title', () => {
    const bad = { extensions: { code: 'BAD_USER_INPUT' } };
    expect(refusal(() => parseInput(submitSchema, { ...valid, completion_percent: 101 }))).toMatchObject({ ...bad, message: 'Completion must be between 0 and 100' });
    expect(refusal(() => parseInput(submitSchema, { ...valid, completion_percent: -1 }))).toMatchObject(bad);
    expect(refusal(() => parseInput(submitSchema, { ...valid, completion_percent: 50.5 }))).toMatchObject({ message: 'Completion must be a whole number' });
    expect(refusal(() => parseInput(submitSchema, { ...valid, achievements: [] }))).toMatchObject({ message: 'Add at least one achievement' });
    expect(refusal(() => parseInput(submitSchema, { ...valid, achievements: [{ title: '  ' }] }))).toMatchObject({ message: 'Achievement title is required' });
    const tooMany = Array.from({ length: EMPLOYEE_TARGET_LIMITS.achievementsMax + 1 }, () => ({ title: 'x' }));
    expect(refusal(() => parseInput(submitSchema, { ...valid, achievements: tooMany }))).toMatchObject(bad);
  });

  it('names the failing field in the error', () => {
    expect(refusal(() => parseInput(submitSchema, { ...valid, achievements: [{ title: '' }] }))).toMatchObject({
      extensions: { fields: ['achievements.0.title'] },
    });
  });
});

describe('assignment input', () => {
  const valid = { employee_id: 'u1', month: '2026-11', goals: [{ title: 'Onboard venues', target_value: 40, unit: 'venues' }] };

  it('needs a real month and between one and the maximum number of goals', () => {
    expect(parseInput(assignSchema, valid)).toMatchObject({
      month: '2026-11',
      notes: '',
      client_request_id: null,
      goals: [{ title: 'Onboard venues', description: '', target_value: 40, unit: 'venues' }],
    });
    expect(refusal(() => parseInput(assignSchema, { ...valid, month: '2026-13' }))).toMatchObject({ message: 'Month must be YYYY-MM' });
    expect(refusal(() => parseInput(assignSchema, { ...valid, goals: [] }))).toMatchObject({ message: 'Add at least one goal' });
    const tooMany = Array.from({ length: EMPLOYEE_TARGET_LIMITS.goalsMax + 1 }, () => ({ title: 'g' }));
    expect(refusal(() => parseInput(assignSchema, { ...valid, goals: tooMany }))).toMatchObject({ message: `At most ${EMPLOYEE_TARGET_LIMITS.goalsMax} goals` });
    expect(refusal(() => parseInput(assignSchema, { ...valid, goals: [{ title: 'g', target_value: -1 }] }))).toMatchObject({ message: 'Target value cannot be negative' });
  });
});
