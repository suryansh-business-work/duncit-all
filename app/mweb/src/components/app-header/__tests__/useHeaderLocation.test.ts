import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { APPLY_LOCATION_EVENT } from '../queries';
import { useHeaderLocation } from '../useHeaderLocation';

/*
  What is under test is WHEN the header persists a pick and with which city +
  area — the nearby Pod Request searches find partners by that saved pair. The
  mutation itself is the server's, so it is a spy here.
*/
const persist = vi.hoisted(() => vi.fn(() => Promise.resolve({})));
vi.mock('@apollo/client/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client/react')>()),
  useMutation: () => [persist],
}));

const LOCATIONS = [
  { id: 'loc-del', location_name: 'Delhi' },
  { id: 'loc-lko', location_name: 'Lucknow' },
];

interface Over {
  me?: { selected_location_id?: string | null; city?: string | null } | null;
  meSettled?: boolean;
  selectedLocationId?: string;
  selectedZoneName?: string;
}

function renderLocation(over: Over = {}) {
  const onLocationChange = vi.fn();
  const onZoneChange = vi.fn();
  const view = renderHook(() =>
    useHeaderLocation({
      me: over.me === undefined ? { selected_location_id: 'loc-lko', city: 'Lucknow' } : over.me,
      meSettled: over.meSettled ?? true,
      locations: LOCATIONS,
      selectedLocationId: over.selectedLocationId ?? 'loc-lko',
      selectedZoneName: over.selectedZoneName ?? 'Gomti Nagar',
      onLocationChange,
      onZoneChange,
    }),
  );
  return { ...view, onLocationChange, onZoneChange };
}

/** Opens the picker, drafts a city + area, applies. */
const applyDraft = (result: ReturnType<typeof renderLocation>['result'], locationId: string, zone: string) => {
  act(() => result.current.openLocationPicker());
  act(() => {
    result.current.dialog.setDraftLocationId(locationId);
    result.current.dialog.setDraftZone(zone);
  });
  act(() => result.current.dialog.onApply());
};

beforeEach(() => persist.mockClear());

describe('useHeaderLocation — persisting the pick', () => {
  it('saves a new city with its area, and commits both', () => {
    const { result, onLocationChange, onZoneChange } = renderLocation();

    applyDraft(result, 'loc-del', 'Saket');

    expect(persist).toHaveBeenCalledWith({ variables: { locationId: 'loc-del', zoneName: 'Saket' } });
    expect(onLocationChange).toHaveBeenCalledWith('loc-del');
    expect(onZoneChange).toHaveBeenCalledWith('Saket');
    expect(result.current.dialog.open).toBe(false);
  });

  it('saves a new area in the same city — the area is part of the pick', () => {
    const { result } = renderLocation();

    applyDraft(result, 'loc-lko', 'Hazratganj');

    expect(persist).toHaveBeenCalledWith({ variables: { locationId: 'loc-lko', zoneName: 'Hazratganj' } });
  });

  it('saves "all areas" as no area', () => {
    const { result } = renderLocation();

    applyDraft(result, 'loc-lko', '');

    expect(persist).toHaveBeenCalledWith({ variables: { locationId: 'loc-lko', zoneName: null } });
  });

  it('does not save the same city and area again', () => {
    const { result } = renderLocation();

    applyDraft(result, 'loc-lko', 'Gomti Nagar');

    expect(persist).not.toHaveBeenCalled();
  });

  it('does not save a pick with no city', () => {
    const { result } = renderLocation();

    applyDraft(result, '', 'Gomti Nagar');

    expect(persist).not.toHaveBeenCalled();
  });

  it('opens the picker on the current city and area as the draft', () => {
    const { result } = renderLocation();

    act(() => result.current.openLocationPicker());

    expect(result.current.dialog).toMatchObject({ open: true, draftLocationId: 'loc-lko', draftZone: 'Gomti Nagar' });
    expect(result.current.selectedLocation).toEqual(LOCATIONS[1]);
  });

  it('a GPS match is committed and saved with its area', () => {
    const { result, onZoneChange } = renderLocation();

    act(() => result.current.dialog.onAutoApply('loc-del', 'Saket'));

    expect(persist).toHaveBeenCalledWith({ variables: { locationId: 'loc-del', zoneName: 'Saket' } });
    expect(onZoneChange).toHaveBeenCalledWith('Saket');
    expect(result.current.dialog.draftZone).toBe('Saket');
  });

  it('a city + area applied from another screen is committed and saved', () => {
    const { onLocationChange, onZoneChange } = renderLocation();

    act(() => {
      globalThis.dispatchEvent(
        new CustomEvent(APPLY_LOCATION_EVENT, { detail: { locationId: 'loc-del', zoneName: 'Saket' } }),
      );
    });

    expect(onLocationChange).toHaveBeenCalledWith('loc-del');
    expect(onZoneChange).toHaveBeenCalledWith('Saket');
    expect(persist).toHaveBeenCalledWith({ variables: { locationId: 'loc-del', zoneName: 'Saket' } });
  });
});

describe('useHeaderLocation — the default city', () => {
  it("lands on the user's saved city without saving it again", () => {
    const { onLocationChange } = renderLocation({ selectedLocationId: '', me: { selected_location_id: 'loc-del' } });

    expect(onLocationChange).toHaveBeenCalledWith('loc-del');
    expect(persist).not.toHaveBeenCalled();
  });

  it("falls back to the user's city by name, then to the first city", () => {
    expect(renderLocation({ selectedLocationId: '', me: { city: 'lucknow' } }).onLocationChange).toHaveBeenCalledWith(
      'loc-lko',
    );
    expect(renderLocation({ selectedLocationId: '', me: null }).onLocationChange).toHaveBeenCalledWith('loc-del');
  });

  it('waits for the user before choosing', () => {
    const { onLocationChange } = renderLocation({ selectedLocationId: '', meSettled: false });

    expect(onLocationChange).not.toHaveBeenCalled();
  });
});
