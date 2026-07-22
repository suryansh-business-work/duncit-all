import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { describe, expect, it } from 'vitest';
import {
  PUBLIC_APP_SETTINGS,
  useDateFormat,
  useDraftRetentionDays,
  useSignupBirthYearBounds,
  formatDurationBetween,
} from '../dateFormat';

function settingsMock(publicAppSettings: Record<string, unknown> | null) {
  return [
    {
      request: { query: PUBLIC_APP_SETTINGS },
      result: { data: { publicAppSettings } },
    },
  ];
}

function makeWrapper(mocks: any[]) {
  return ({ children }: { children: React.ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );
}

const FULL_SETTINGS = {
  date_format: 'yyyy-MM-dd',
  time_format: 'HH:mm',
  time_zone: 'UTC',
  min_birth_year: 1950,
  max_birth_year: 2005,
  draft_retention_days: 7,
};

describe('formatDurationBetween', () => {
  it('returns null when either side missing or invalid', () => {
    expect(formatDurationBetween(null, new Date())).toBeNull();
    expect(formatDurationBetween(new Date(), null)).toBeNull();
    expect(formatDurationBetween(new Date(NaN), new Date())).toBeNull();
    expect(formatDurationBetween(new Date(), new Date(NaN))).toBeNull();
  });

  it('returns null when end is not after start', () => {
    const t = new Date('2026-01-01T00:00:00Z');
    expect(formatDurationBetween(t, t)).toBeNull();
    expect(formatDurationBetween(t, new Date('2025-12-31T00:00:00Z'))).toBeNull();
  });

  it('formats days, hours and minutes', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    expect(formatDurationBetween(start, new Date('2026-01-03T03:00:00Z'))).toBe('2d 3h');
    expect(formatDurationBetween(start, new Date('2026-01-01T02:30:00Z'))).toBe('2h 30m');
    expect(formatDurationBetween(start, new Date('2026-01-01T00:45:00Z'))).toBe('45m');
  });

  it('shows 0m when duration rounds to a whole hour with no leftover minutes', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    expect(formatDurationBetween(start, new Date('2026-01-01T01:00:00Z'))).toBe('1h');
  });
});

describe('useDraftRetentionDays', () => {
  it('returns admin value when present', async () => {
    const { result } = renderHook(() => useDraftRetentionDays(), {
      wrapper: makeWrapper(settingsMock(FULL_SETTINGS)),
    });
    await waitFor(() => expect(result.current).toBe(7));
  });

  it('falls back to 3 when no data', async () => {
    const { result } = renderHook(() => useDraftRetentionDays(), {
      wrapper: makeWrapper(settingsMock(null)),
    });
    expect(result.current).toBe(3);
    await waitFor(() => expect(result.current).toBe(3));
  });
});

describe('useSignupBirthYearBounds', () => {
  it('returns admin bounds when present', async () => {
    const { result } = renderHook(() => useSignupBirthYearBounds(), {
      wrapper: makeWrapper(settingsMock(FULL_SETTINGS)),
    });
    await waitFor(() => expect(result.current.minBirthYear).toBe(1950));
    expect(result.current.maxBirthYear).toBe(2005);
  });

  it('falls back when data missing', async () => {
    const { result } = renderHook(() => useSignupBirthYearBounds(), {
      wrapper: makeWrapper(settingsMock({ date_format: null } as any)),
    });
    await waitFor(() => expect(result.current.minBirthYear).toBe(1940));
    expect(result.current.maxBirthYear).toBe(2012);
  });
});

describe('useDateFormat', () => {
  it('uses admin formats and zone', async () => {
    const { result } = renderHook(() => useDateFormat(), {
      wrapper: makeWrapper(settingsMock(FULL_SETTINGS)),
    });
    await waitFor(() => expect(result.current.dateFormat).toBe('yyyy-MM-dd'));
    expect(result.current.timeFormat).toBe('HH:mm');
    expect(result.current.timeZone).toBe('UTC');

    // string ISO input
    expect(result.current.formatDate('2026-01-02T05:00:00Z')).toBe('2026-01-02');
    expect(result.current.formatTime('2026-01-02T05:00:00Z')).toBe('05:00');
    expect(result.current.formatDateTime('2026-01-02T05:00:00Z')).toBe('2026-01-02 · 05:00');

    // number (epoch ms) input
    const epoch = Date.UTC(2026, 0, 2, 5, 0, 0);
    expect(result.current.formatDate(epoch)).toBe('2026-01-02');

    // Date instance input
    expect(result.current.formatDate(new Date('2026-01-02T05:00:00Z'))).toBe('2026-01-02');
  });

  it('returns fallbacks and handles invalid/empty inputs', async () => {
    const { result } = renderHook(() => useDateFormat(), {
      wrapper: makeWrapper(settingsMock(null)),
    });
    // fallbacks
    expect(result.current.dateFormat).toBe('dd MMM yyyy');
    expect(result.current.timeFormat).toBe('hh:mm a');
    expect(result.current.timeZone).toBe('Asia/Kolkata');

    // empty / null input -> ''
    expect(result.current.formatDate(null)).toBe('');
    expect(result.current.formatDate(undefined)).toBe('');
    expect(result.current.formatDate('')).toBe('');

    // invalid Date instance -> null -> ''
    expect(result.current.formatDate(new Date(NaN))).toBe('');

    await waitFor(() => expect(result.current.dateFormat).toBe('dd MMM yyyy'));
  });
});
