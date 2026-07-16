import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('@apollo/client', () => ({
  gql: (strings: TemplateStringsArray) => strings,
  useQuery: useQueryMock,
}));

// Wrap parseISO so a sentinel input exercises the toDateLocal try/catch guard,
// keeping every other date-fns function real.
vi.mock('date-fns', async (importOriginal) => {
  const actual = await importOriginal<typeof import('date-fns')>();
  return {
    ...actual,
    parseISO: (value: string, options?: unknown) => {
      if (value === '__throws__') throw new Error('bad iso');
      return actual.parseISO(value, options as never);
    },
  };
});

// Import AFTER the mocks are registered.
const { useDateFormat } = await import('../src/useDateFormat');

type Settings = { date_format?: string; time_format?: string; time_zone?: string };

const withSettings = (settings?: Settings) => {
  useQueryMock.mockReturnValue({ data: settings ? { publicAppSettings: settings } : undefined });
};

beforeEach(() => {
  useQueryMock.mockReset();
  withSettings();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDateFormat — local mode (default)', () => {
  it('falls back to the built-in patterns and zone when settings are absent', () => {
    const f = useDateFormat();
    expect(f.dateFormat).toBe('dd MMM yyyy');
    expect(f.timeFormat).toBe('hh:mm a');
    expect(f.timeZone).toBe('Asia/Kolkata');
  });

  it('formats Date, ISO string and epoch-millis inputs with the local patterns', () => {
    const f = useDateFormat();
    expect(f.formatDate(new Date(2024, 0, 15))).toBe('15 Jan 2024');
    expect(f.formatDate('2024-03-09')).toBe('09 Mar 2024');
    expect(f.formatDate(new Date(2024, 0, 15).getTime())).toBe('15 Jan 2024');
    expect(f.formatTime(new Date(2024, 0, 15, 14, 30))).toBe('02:30 PM');
    expect(f.formatDateTime(new Date(2024, 0, 15, 14, 30))).toBe('15 Jan 2024 · 02:30 PM');
    expect(f.dayKey(new Date(2024, 0, 15))).toBe('2024-01-15');
  });

  it('returns "" for empty, nullish and invalid Date inputs', () => {
    const f = useDateFormat();
    expect(f.formatDate('')).toBe('');
    expect(f.formatDate(null)).toBe('');
    expect(f.formatDate(undefined)).toBe('');
    expect(f.formatDate(new Date('invalid'))).toBe('');
  });

  it('returns "" when parseISO throws (coercion guard)', () => {
    const f = useDateFormat();
    expect(f.formatDate('__throws__')).toBe('');
  });

  it('returns "" when the formatter itself throws on an unparseable string', () => {
    const f = useDateFormat();
    expect(f.formatDate('not-a-real-date')).toBe('');
  });

  it('uses admin-configured patterns and zone when provided', () => {
    withSettings({ date_format: 'yyyy/MM/dd', time_format: 'HH:mm', time_zone: 'America/New_York' });
    const f = useDateFormat();
    expect(f.dateFormat).toBe('yyyy/MM/dd');
    expect(f.timeFormat).toBe('HH:mm');
    expect(f.timeZone).toBe('America/New_York');
    expect(f.formatDate(new Date(2024, 0, 15))).toBe('2024/01/15');
  });

  it('falls back when settings fields are present but empty', () => {
    withSettings({ date_format: '', time_format: '', time_zone: '' });
    const f = useDateFormat();
    expect(f.dateFormat).toBe('dd MMM yyyy');
    expect(f.timeFormat).toBe('hh:mm a');
    expect(f.timeZone).toBe('Asia/Kolkata');
  });

  it('labels Today / Yesterday / an explicit date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0));
    const f = useDateFormat();
    expect(f.dayLabel(new Date(2024, 5, 15, 8, 0, 0))).toBe('Today');
    expect(f.dayLabel(new Date(2024, 5, 14, 8, 0, 0))).toBe('Yesterday');
    expect(f.dayLabel(new Date(2024, 5, 10))).toBe('10 Jun 2024');
    expect(f.dayLabel('')).toBe('');
  });
});

describe('useDateFormat — time-zone-aware mode', () => {
  it('uses the zoned fallback time pattern when settings are absent', () => {
    const f = useDateFormat({ timeZoneAware: true });
    expect(f.timeFormat).toBe('HH:mm');
    expect(f.timeZone).toBe('Asia/Kolkata');
  });

  it('formats an instant in the configured zone', () => {
    withSettings({ date_format: 'yyyy-MM-dd', time_format: 'HH:mm', time_zone: 'Asia/Kolkata' });
    const f = useDateFormat({ timeZoneAware: true });
    // 12:00 UTC is 17:30 IST on the same calendar day.
    expect(f.formatDate('2024-01-15T12:00:00Z')).toBe('2024-01-15');
    expect(f.formatTime('2024-01-15T12:00:00Z')).toBe('17:30');
  });

  it('accepts a Date instance directly in zoned mode', () => {
    withSettings({ date_format: 'yyyy-MM-dd', time_format: 'HH:mm', time_zone: 'UTC' });
    const f = useDateFormat({ timeZoneAware: true });
    expect(f.formatDate(new Date(Date.UTC(2024, 0, 15, 12, 0)))).toBe('2024-01-15');
  });

  it('returns "" for empty and invalid inputs in zoned mode', () => {
    const f = useDateFormat({ timeZoneAware: true });
    expect(f.formatDate('')).toBe('');
    expect(f.formatDate(null)).toBe('');
    expect(f.formatDate('totally-not-a-date')).toBe('');
  });

  it('returns "" when zoned formatting throws on a bad pattern', () => {
    withSettings({ date_format: 'D', time_format: 'HH:mm', time_zone: 'Asia/Kolkata' });
    const f = useDateFormat({ timeZoneAware: true });
    expect(f.formatDate('2024-01-15T12:00:00Z')).toBe('');
  });
});
