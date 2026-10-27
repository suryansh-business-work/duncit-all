import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

/** A Monday afternoon, in the reader's own zone. */
const { NOW } = vi.hoisted(() => ({ NOW: new Date(2026, 9, 26, 15, 30) }));
vi.mock('@duncit/app-settings', async (io) => ({
  ...(await io<typeof import('@duncit/app-settings')>()),
  useDateFormat: () => ({ now: () => NOW }),
}));

import {
  DEFAULT_RANGE_DAYS,
  MAX_RANGE_DAYS,
  rangeProblem,
  useDashboardRange,
} from '../../../src/pages/dashboard/useDashboardRange';

const day = (month: number, date: number) => new Date(2026, month, date);

describe('rangeProblem', () => {
  it('accepts a window that runs forward, a single day included', () => {
    expect(rangeProblem({ from: day(9, 1), to: day(9, 26) })).toBeNull();
    expect(rangeProblem({ from: day(9, 26), to: day(9, 26) })).toBeNull();
  });

  it('refuses a From day after the To day', () => {
    expect(rangeProblem({ from: day(9, 27), to: day(9, 26) })).toBe('order');
  });

  it('allows exactly the longest window the server answers, and refuses one day more', () => {
    expect(MAX_RANGE_DAYS).toBe(366);
    // 2026-01-01 to 2027-01-01 inclusive is 366 days.
    expect(rangeProblem({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 1) })).toBeNull();
    expect(rangeProblem({ from: new Date(2026, 0, 1), to: new Date(2027, 0, 2) })).toBe('length');
  });
});

describe('useDashboardRange', () => {
  it('opens on the last 30 days, today included', () => {
    const { result } = renderHook(() => useDashboardRange());
    expect(DEFAULT_RANGE_DAYS).toBe(30);
    expect(result.current.range).toEqual({ from: day(8, 27), to: day(9, 26) });
    expect(result.current.problem).toBeNull();
  });

  it('asks the server for whole days: the start of From up to the start of the day after To', () => {
    const { result } = renderHook(() => useDashboardRange());
    expect(result.current.period).toEqual({
      from: day(8, 27).toISOString(),
      to: day(9, 27).toISOString(),
    });
  });

  it('follows a new window, and names the problem with one that runs backwards', () => {
    const { result } = renderHook(() => useDashboardRange());
    act(() => result.current.setRange({ from: day(9, 20), to: day(9, 22) }));
    expect(result.current.period).toEqual({ from: day(9, 20).toISOString(), to: day(9, 23).toISOString() });
    act(() => result.current.setRange({ from: day(9, 25), to: day(9, 22) }));
    expect(result.current.problem).toBe('order');
  });
});
