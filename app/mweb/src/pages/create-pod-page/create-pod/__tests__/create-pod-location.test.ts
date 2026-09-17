import { act, renderHook } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { applyPodLocation } from '../create-pod.location';
import { blankCreatePodForm, type CreatePodFormValues } from '../create-pod.types';

const podInGomtiNagar: Partial<CreatePodFormValues> = {
  location_id: 'loc-lucknow',
  locality: 'Gomti Nagar',
  club_id: 'club-who-even-are-we',
  venue_id: 'venue-gomti-arena',
  venue_slot_id: 'slot-sat-6pm',
};

const renderForm = (initial: Partial<CreatePodFormValues> = podInGomtiNagar) =>
  renderHook(() =>
    useForm<CreatePodFormValues, any, CreatePodFormValues>({
      defaultValues: { ...blankCreatePodForm, ...initial },
    }),
  );

describe('applyPodLocation', () => {
  it('ignores a pick that names no city', () => {
    const { result } = renderForm();

    act(() => applyPodLocation(result.current, '', 'Hazratganj'));

    expect(result.current.getValues()).toMatchObject(podInGomtiNagar);
  });

  it('keeps the club, venue and slot when the same area is picked again', () => {
    const { result } = renderForm();

    act(() => applyPodLocation(result.current, 'loc-lucknow', 'Gomti Nagar'));

    expect(result.current.getValues()).toMatchObject(podInGomtiNagar);
  });

  it('clears only the club when the area moves within the city', () => {
    const { result } = renderForm();

    act(() => applyPodLocation(result.current, 'loc-lucknow', 'Hazratganj'));

    expect(result.current.getValues()).toMatchObject({
      location_id: 'loc-lucknow',
      locality: 'Hazratganj',
      club_id: '',
      venue_id: 'venue-gomti-arena',
      venue_slot_id: 'slot-sat-6pm',
    });
  });

  it('clears the club, venue and slot when the city changes', () => {
    const { result } = renderForm();

    act(() => applyPodLocation(result.current, 'loc-pune', 'Baner'));

    expect(result.current.getValues()).toMatchObject({
      location_id: 'loc-pune',
      locality: 'Baner',
      club_id: '',
      venue_id: '',
      venue_slot_id: '',
    });
  });
});
