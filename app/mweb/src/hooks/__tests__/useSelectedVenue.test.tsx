import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SELECTED_VENUE_KEY, useSelectedVenue } from '../useSelectedVenue';

const DRAFT = { id: 'v-draft', venue_name: 'Draft Hall', status: 'DRAFT' };
const TURF = { id: 'v-turf', venue_name: 'Turf', status: 'APPROVED' };
const HALL = { id: 'v-hall', venue_name: 'Hall', status: 'APPROVED' };

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSelectedVenue', () => {
  it('falls back to the in-flight application when nothing was picked yet', () => {
    const { result } = renderHook(() => useSelectedVenue([TURF, DRAFT, HALL]));
    expect(result.current.venueId).toBe('v-draft');
  });

  it('opens on the venue picked earlier, on any page', () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-hall');
    const { result } = renderHook(() => useSelectedVenue([TURF, DRAFT, HALL]));
    expect(result.current.venue).toBe(HALL);
  });

  it('remembers a new pick and shows it at once', () => {
    const { result } = renderHook(() => useSelectedVenue([TURF, HALL]));
    expect(result.current.venueId).toBe('v-turf');
    act(() => result.current.selectVenue('v-hall'));
    expect(result.current.venueId).toBe('v-hall');
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-hall');
    // A page mounted afterwards opens on the same venue.
    const next = renderHook(() => useSelectedVenue([TURF, HALL]));
    expect(next.result.current.venueId).toBe('v-hall');
  });

  it('falls back safely when the stored venue is not in this page’s list', () => {
    // e.g. a draft venue was picked, and this page lists approved venues only.
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-draft');
    const { result } = renderHook(() => useSelectedVenue([TURF, HALL]));
    expect(result.current.venueId).toBe('v-turf');
  });

  it('has no venue while the owner has none', () => {
    const { result } = renderHook(() => useSelectedVenue([]));
    expect(result.current).toMatchObject({ venue: null, venueId: null });
  });

  it('still works, unremembered, when storage is blocked', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const { result } = renderHook(() => useSelectedVenue([TURF, HALL]));
    expect(result.current.venueId).toBe('v-turf');
    act(() => result.current.selectVenue('v-hall'));
    // The pick still applies on this page; it just is not carried to the next.
    expect(result.current.venueId).toBe('v-hall');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});
