import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { useDateFormat } from '@duncit/app-settings';
import { publicAppSettingsMock } from './testkit';

const wrapper =
  (mocks: any[] = [publicAppSettingsMock()]) =>
  ({ children }: { children: React.ReactNode }) => (
    <MockedProvider mocks={mocks} addTypename={false}>
      {children}
    </MockedProvider>
  );

describe('useDateFormat', () => {
  it('formats time in the configured zone and labels relative days', async () => {
    const { result } = renderHook(() => useDateFormat({ timeZoneAware: true }), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.timeZone).toBe('Asia/Kolkata'));

    const today = new Date();
    const yesterday = new Date(Date.now() - 86_400_000);
    const old = new Date('2020-01-15T08:30:00Z');

    expect(result.current.dayLabel(today.toISOString())).toBe('Today');
    expect(result.current.dayLabel(yesterday.toISOString())).toBe('Yesterday');
    // An older date falls through to the configured date pattern.
    expect(result.current.dayLabel(old.toISOString())).toMatch(/2020/);
    expect(result.current.formatTime(old.toISOString())).toMatch(/\d{2}:\d{2}/);
    expect(result.current.dayKey(old.toISOString())).toBe('2020-01-15');
  });

  it('returns empty strings for missing or invalid input (fallback settings)', () => {
    const { result } = renderHook(() => useDateFormat({ timeZoneAware: true }), { wrapper: wrapper([]) });
    // No settings resolved yet → uses fallbacks, still safe for bad input.
    expect(result.current.formatTime(null)).toBe('');
    expect(result.current.dayLabel(undefined)).toBe('');
    expect(result.current.dayKey('not-a-date')).toBe('');
  });

  it('falls back when an invalid time zone is configured (catch path)', async () => {
    const bad = publicAppSettingsMock({ time_zone: 'Not/AZone' });
    const { result } = renderHook(() => useDateFormat({ timeZoneAware: true }), { wrapper: wrapper([bad]) });
    await waitFor(() => expect(result.current.timeZone).toBe('Not/AZone'));
    expect(result.current.formatTime(new Date().toISOString())).toBe('');
  });
});
