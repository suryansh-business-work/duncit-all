import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';

import { AppLocationProvider } from '../../../app/AppLocationContext';
import { useNearbySearch } from '../useNearbySearch';

const renderSearch = (defaults: readonly string[], zoneName = 'Gomti Nagar', locationId = 'loc-lko') =>
  renderHook(({ ids }: { ids: readonly string[] }) => useNearbySearch(ids), {
    initialProps: { ids: defaults },
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppLocationProvider locationId={locationId} zoneName={zoneName}>
        {children}
      </AppLocationProvider>
    ),
  });

describe('useNearbySearch', () => {
  it("starts at 5 km around the header's city and area, filtered to the defaults", () => {
    const { result } = renderSearch(['cat-sports']);

    expect(result.current.radiusKm).toBe(5);
    expect(result.current.categoryIds).toEqual(['cat-sports']);
    expect(result.current.search).toEqual({
      location_id: 'loc-lko',
      zone_name: 'Gomti Nagar',
      radius_km: 5,
      category_ids: ['cat-sports'],
    });
  });

  it('sends no area when the header has only a city', () => {
    const { result } = renderSearch([], '');

    expect(result.current.search.zone_name).toBeNull();
    expect(result.current.zoneName).toBe('');
  });

  it('has no centre until a city is picked', () => {
    const { result } = renderSearch([], '', '');

    expect(result.current.locationId).toBe('');
    expect(result.current.search.location_id).toBe('');
  });

  it('keeps the radius inside 0–10 km', () => {
    const { result } = renderSearch([]);

    act(() => result.current.setRadiusKm(25));
    expect(result.current.radiusKm).toBe(10);
    act(() => result.current.setRadiusKm(-3));
    expect(result.current.radiusKm).toBe(0);
    act(() => result.current.setRadiusKm(7.5));
    expect(result.current.search.radius_km).toBe(7.5);
  });

  it("follows new defaults until the partner picks, then keeps the partner's pick — including All categories", () => {
    const { result, rerender } = renderSearch([]);

    // The host's categories arrive after the first paint.
    rerender({ ids: ['cat-run', 'cat-cycle'] });
    expect(result.current.categoryIds).toEqual(['cat-run', 'cat-cycle']);

    act(() => result.current.setCategoryIds([]));
    rerender({ ids: ['cat-yoga'] });

    expect(result.current.categoryIds).toEqual([]);
    expect(result.current.search.category_ids).toEqual([]);
  });

  it('resetCategories brings the defaults back (another venue picked)', () => {
    const { result, rerender } = renderSearch(['cat-sports']);
    act(() => result.current.setCategoryIds(['cat-music']));
    expect(result.current.categoryIds).toEqual(['cat-music']);

    rerender({ ids: ['cat-food'] });
    act(() => result.current.resetCategories());

    expect(result.current.categoryIds).toEqual(['cat-food']);
  });
});
