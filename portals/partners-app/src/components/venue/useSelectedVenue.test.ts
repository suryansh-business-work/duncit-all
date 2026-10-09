import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ALL_VENUES, SELECTED_VENUE_KEY, useSelectedVenue, useVenueFilter } from './useSelectedVenue';

// myVenues answers newest first; the in-flight application is the default pick.
const VENUES = [
  { id: 'v-new', venue_name: 'Rooftop', status: 'APPROVED' },
  { id: 'v-draft', venue_name: 'Garden', status: 'DRAFT' },
  { id: 'v-old', venue_name: 'Hall', status: 'APPROVED' },
];

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useSelectedVenue', () => {
  it('opens on the shared default (the in-flight application) when nothing was picked', () => {
    const { result } = renderHook(() => useSelectedVenue(VENUES));
    expect(result.current.venueId).toBe('v-draft');
    expect(result.current.venue?.venue_name).toBe('Garden');
  });

  it('remembers a pick, so the next venue page opens on it', () => {
    const first = renderHook(() => useSelectedVenue(VENUES));
    act(() => first.result.current.selectVenue('v-old'));
    expect(first.result.current.venueId).toBe('v-old');
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-old');

    const next = renderHook(() => useSelectedVenue(VENUES));
    expect(next.result.current.venueId).toBe('v-old');
  });

  it('falls back safely when the remembered venue is no longer the owner\'s', () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-gone');
    const { result } = renderHook(() => useSelectedVenue(VENUES));
    expect(result.current.venueId).toBe('v-draft');
  });

  it('has no venue while the owner has none', () => {
    const { result } = renderHook(() => useSelectedVenue([]));
    expect(result.current.venue).toBeNull();
    expect(result.current.venueId).toBeNull();
  });

  it('still works, and says so, when the browser blocks storage', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const { result } = renderHook(() => useSelectedVenue(VENUES));
    expect(result.current.venueId).toBe('v-draft');
    act(() => result.current.selectVenue('v-new'));
    expect(result.current.venueId).toBe('v-new');
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('useVenueFilter', () => {
  it('opens on the selected venue, not on "All venues"', () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-old');
    const { result } = renderHook(() => useVenueFilter(VENUES));
    expect(result.current.value).toBe('v-old');
    expect(result.current.venueIdOrNull).toBe('v-old');
  });

  it('shows every venue on "All" without forgetting the selected one', () => {
    localStorage.setItem(SELECTED_VENUE_KEY, 'v-old');
    const { result } = renderHook(() => useVenueFilter(VENUES));
    act(() => result.current.change(ALL_VENUES));
    expect(result.current.value).toBe(ALL_VENUES);
    expect(result.current.venueIdOrNull).toBeNull();
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-old');
  });

  it('selects a single venue everywhere when one is picked', () => {
    const { result } = renderHook(() => useVenueFilter(VENUES));
    act(() => result.current.change(ALL_VENUES));
    act(() => result.current.change('v-new'));
    expect(result.current.venueIdOrNull).toBe('v-new');
    expect(localStorage.getItem(SELECTED_VENUE_KEY)).toBe('v-new');
  });

  it('shows every venue while the owner has none to select', () => {
    const { result } = renderHook(() => useVenueFilter([]));
    expect(result.current.value).toBe(ALL_VENUES);
    expect(result.current.venueIdOrNull).toBeNull();
  });
});
