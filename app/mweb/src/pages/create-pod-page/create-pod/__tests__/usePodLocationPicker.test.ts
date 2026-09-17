import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod.types';
import { usePodLocationPicker } from '../usePodLocationPicker';

function renderPicker(onPicked?: () => void) {
  return renderHook(() => {
    const form = useForm<CreatePodFormValues, any, CreatePodFormValues>({
      defaultValues: {
        ...blankCreatePodForm,
        location_id: 'loc-lucknow',
        locality: 'Gomti Nagar',
        club_id: 'club-who-even-are-we',
      },
    });
    return { form, picker: usePodLocationPicker(form, onPicked) };
  });
}

describe('usePodLocationPicker', () => {
  it('starts closed with an empty draft', () => {
    const { result } = renderPicker();

    expect(result.current.picker.dialog).toMatchObject({
      open: false,
      draftLocationId: '',
      draftZone: '',
    });
  });

  it("opens on the pod's current city and area", () => {
    const { result } = renderPicker();

    act(() => result.current.picker.openPicker());

    expect(result.current.picker.dialog).toMatchObject({
      open: true,
      draftLocationId: 'loc-lucknow',
      draftZone: 'Gomti Nagar',
    });
  });

  it('applies the edited draft, tells the caller first, and closes', () => {
    const onPicked = vi.fn();
    const { result } = renderPicker(onPicked);
    act(() => result.current.picker.openPicker());

    act(() => {
      result.current.picker.dialog.setDraftLocationId('loc-pune');
      result.current.picker.dialog.setDraftZone('Baner');
    });
    act(() => result.current.picker.dialog.onApply());

    expect(onPicked).toHaveBeenCalledTimes(1);
    expect(result.current.picker.dialog.open).toBe(false);
    expect(result.current.form.getValues()).toMatchObject({
      location_id: 'loc-pune',
      locality: 'Baner',
      club_id: '',
    });
  });

  it('applies a GPS pick straight away, reading a missing area as none', () => {
    const { result } = renderPicker();
    act(() => result.current.picker.openPicker());

    // LocationDialog's GPS path can hand back an undefined zone at runtime.
    act(() => result.current.picker.dialog.onAutoApply('loc-lucknow', undefined as unknown as string));

    expect(result.current.picker.dialog.open).toBe(false);
    expect(result.current.form.getValues()).toMatchObject({
      location_id: 'loc-lucknow',
      locality: '',
      club_id: '',
    });
  });

  it('closes without touching the pod', () => {
    const { result } = renderPicker();
    act(() => result.current.picker.openPicker());

    act(() => result.current.picker.dialog.onClose());

    expect(result.current.picker.dialog.open).toBe(false);
    expect(result.current.form.getValues()).toMatchObject({
      location_id: 'loc-lucknow',
      locality: 'Gomti Nagar',
      club_id: 'club-who-even-are-we',
    });
  });
});
