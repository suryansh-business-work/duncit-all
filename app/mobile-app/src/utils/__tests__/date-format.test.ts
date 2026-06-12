import {
  formatDate,
  formatDateTime,
  formatDurationBetween,
  formatRelative,
  statusRemainingLabel,
} from '@/utils/date-format';

describe('formatDate', () => {
  it('formats an ISO string', () => {
    expect(formatDate('2026-06-07T00:00:00Z')).toMatch(/2026/);
  });

  it('formats a Date and a numeric timestamp', () => {
    expect(formatDate(new Date('2026-06-07T00:00:00Z'))).toMatch(/Jun/);
    expect(formatDate(Date.parse('2026-06-07T00:00:00Z'))).toMatch(/2026/);
  });

  it('returns empty string for nullish, invalid Date and unparseable input', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate(new Date('nope'))).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatDateTime', () => {
  it('includes a time component', () => {
    expect(formatDateTime('2026-06-07T18:30:00Z')).toMatch(/2026/);
  });

  it('returns empty string when unparseable', () => {
    expect(formatDateTime('')).toBe('');
  });
});

describe('statusRemainingLabel', () => {
  const now = new Date('2026-06-07T12:00:00Z');

  it('returns null for missing, invalid or expired values', () => {
    expect(statusRemainingLabel(null, now)).toBeNull();
    expect(statusRemainingLabel('not-a-date', now)).toBeNull();
    expect(statusRemainingLabel('2026-06-07T11:00:00Z', now)).toBeNull();
  });

  it('returns compact minutes, hours and days remaining', () => {
    expect(statusRemainingLabel('2026-06-07T12:45:00Z', now)).toBe('45m remaining');
    expect(statusRemainingLabel('2026-06-07T18:00:00Z', now)).toBe('6h remaining');
    expect(statusRemainingLabel('2026-06-09T13:00:00Z', now)).toBe('2d remaining');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-06-07T12:00:00Z').getTime();
  beforeEach(() => jest.spyOn(Date, 'now').mockReturnValue(now));
  afterEach(() => jest.restoreAllMocks());

  it('returns "now" under a minute', () => {
    expect(formatRelative('2026-06-07T11:59:30Z')).toBe('now');
  });

  it('returns minutes, hours and days', () => {
    expect(formatRelative('2026-06-07T11:30:00Z')).toBe('30m');
    expect(formatRelative('2026-06-07T09:00:00Z')).toBe('3h');
    expect(formatRelative('2026-06-04T12:00:00Z')).toBe('3d');
  });
});

describe('formatDurationBetween', () => {
  const start = new Date('2026-06-07T12:00:00Z');

  it('returns null for missing, invalid or non-positive ranges', () => {
    expect(formatDurationBetween(null, start)).toBeNull();
    expect(formatDurationBetween(start, null)).toBeNull();
    expect(formatDurationBetween(start, new Date('bad'))).toBeNull();
    expect(formatDurationBetween(start, start)).toBeNull();
  });

  it('formats minutes, hours and days', () => {
    expect(formatDurationBetween(start, new Date('2026-06-07T12:45:00Z'))).toBe('45m');
    expect(formatDurationBetween(start, new Date('2026-06-07T14:30:00Z'))).toBe('2h 30m');
    expect(formatDurationBetween(start, new Date('2026-06-09T15:00:00Z'))).toBe('2d 3h');
    expect(formatDurationBetween(start, new Date('2026-06-07T14:00:00Z'))).toBe('2h');
  });
});
