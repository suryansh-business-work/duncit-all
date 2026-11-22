/**
 * Club Admin host engagement settings: the clamps, the status list's reading,
 * and the merge that keeps every saved key alive.
 */
import {
  DEFAULT_HOST_ENGAGEMENT_STATUSES,
  cleanHostInactivityDays,
  cleanHostMonthlyPodTarget,
  cleanHostPerformanceNotifyDay,
  cleanHostUnderperformThresholdPct,
  hostEngagementSettingsOf,
  mergeHostEngagementStatuses,
  readHostEngagementStatuses,
  statusKeyFromLabel,
} from '../../settings.hostEngagement';

const stored = DEFAULT_HOST_ENGAGEMENT_STATUSES.map((row) => ({ ...row }));

describe('host engagement number clamps', () => {
  it.each([
    [undefined, 14],
    [null, 14],
    ['', 14],
    ['soon', 14],
    [0, 1],
    [7.9, 7],
    [91, 90],
    [30, 30],
  ])('inactivity days %p -> %p', (input, expected) => {
    expect(cleanHostInactivityDays(input)).toBe(expected);
  });

  it.each([
    [undefined, 8],
    [0, 1],
    [8, 8],
    [101, 100],
  ])('monthly target %p -> %p', (input, expected) => {
    expect(cleanHostMonthlyPodTarget(input)).toBe(expected);
  });

  it('holds the notify day to 1-28 so every month has it', () => {
    expect(cleanHostPerformanceNotifyDay(31)).toBe(28);
    expect(cleanHostPerformanceNotifyDay(0)).toBe(1);
    expect(cleanHostPerformanceNotifyDay(undefined)).toBe(1);
  });

  it('holds the threshold to 1-100 with 100 as the default', () => {
    expect(cleanHostUnderperformThresholdPct(undefined)).toBe(100);
    expect(cleanHostUnderperformThresholdPct(150)).toBe(100);
    expect(cleanHostUnderperformThresholdPct(-5)).toBe(1);
    expect(cleanHostUnderperformThresholdPct(60)).toBe(60);
  });
});

describe('readHostEngagementStatuses', () => {
  it('reads an empty or missing list as the six defaults', () => {
    expect(readHostEngagementStatuses(undefined).map((s) => s.key)).toEqual([
      'NOT_CONTACTED',
      'CONTACTED',
      'ENGAGING',
      'ACTIVE',
      'NOT_RESPONDING',
      'INACTIVE',
    ]);
    expect(readHostEngagementStatuses([])).toHaveLength(6);
  });

  it('drops malformed rows and reads a missing is_active as active', () => {
    const rows = readHostEngagementStatuses([{ key: 'A', label: 'A' }, { label: 'no key' }, null]);
    expect(rows).toEqual([{ key: 'A', label: 'A', is_active: true }]);
  });
});

describe('statusKeyFromLabel', () => {
  it('derives an upper snake key and trims stray separators', () => {
    expect(statusKeyFromLabel('  Call back later! ')).toBe('CALL_BACK_LATER');
    expect(statusKeyFromLabel('***')).toBe('STATUS');
  });
});

describe('mergeHostEngagementStatuses', () => {
  it('renames and reorders while keeping keys', () => {
    const out = mergeHostEngagementStatuses(
      [
        { key: 'CONTACTED', label: 'Spoke to them', is_active: true },
        { key: 'NOT_CONTACTED', label: 'Not Contacted', is_active: true },
      ],
      stored,
    );
    expect(out[0]).toEqual({ key: 'CONTACTED', label: 'Spoke to them', is_active: true });
    expect(out[1].key).toBe('NOT_CONTACTED');
  });

  it('keeps a stored key the admin left out, switched off at the end', () => {
    const out = mergeHostEngagementStatuses([{ key: 'ACTIVE', label: 'Active', is_active: true }], stored);
    expect(out).toHaveLength(6);
    expect(out.find((s) => s.key === 'INACTIVE')).toEqual({ key: 'INACTIVE', label: 'Inactive', is_active: false });
    expect(out.filter((s) => s.is_active).map((s) => s.key)).toEqual(['ACTIVE']);
  });

  it('gives a new row a key derived from its label, unique against stored keys', () => {
    const out = mergeHostEngagementStatuses(
      [
        ...stored,
        { label: 'Active', is_active: true },
        { label: 'Needs a venue', is_active: true },
      ],
      stored,
    );
    expect(out.map((s) => s.key)).toContain('ACTIVE_2');
    expect(out.map((s) => s.key)).toContain('NEEDS_A_VENUE');
  });

  it.each([
    [[{ key: 'MADE_UP', label: 'X', is_active: true }], /Unknown status key/],
    [[{ key: 'ACTIVE', label: '  ', is_active: true }], /needs a label/],
    [[{ key: 'ACTIVE', label: 'x'.repeat(41), is_active: true }], /at most 40/],
    [
      [
        { key: 'ACTIVE', label: 'A', is_active: true },
        { key: 'ACTIVE', label: 'B', is_active: true },
      ],
      /listed twice/,
    ],
    [stored.map((s) => ({ ...s, is_active: false })), /At least one status/],
  ])('refuses %j', (input, message) => {
    expect(() => mergeHostEngagementStatuses(input, stored)).toThrow(message);
  });

  it('refuses more than twenty statuses', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ label: `Extra ${i}`, is_active: true }));
    expect(() => mergeHostEngagementStatuses([...stored, ...many], stored)).toThrow(/At most 20/);
  });
});

describe('hostEngagementSettingsOf', () => {
  it('reads a fresh install as the defaults, notifications off', () => {
    expect(hostEngagementSettingsOf(null)).toMatchObject({
      inactivity_days: 14,
      monthly_pod_target: 8,
      notify_enabled: false,
      notify_day: 1,
      notify_hosts: true,
      notify_club_admins: true,
      underperform_threshold_pct: 100,
    });
  });

  it('clamps stored values written outside the service', () => {
    expect(hostEngagementSettingsOf({ host_inactivity_days: 400, host_monthly_pod_target: 0 })).toMatchObject({
      inactivity_days: 90,
      monthly_pod_target: 1,
    });
  });
});
