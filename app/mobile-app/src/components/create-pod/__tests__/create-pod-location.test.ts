import { act, renderHook } from '@testing-library/react-native';
import { useForm } from 'react-hook-form';

import { applyPodLocation } from '@/components/create-pod/create-pod.location';
import {
  blankCreatePodForm,
  type CreatePodFormValues,
} from '@/components/create-pod/create-pod.types';

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

/** Moves the pod and answers whether a club, venue or slot pick was cleared. */
const move = (
  form: ReturnType<typeof renderForm>['result']['current'],
  city: string,
  area: string,
) => {
  let cleared = false;
  act(() => {
    cleared = applyPodLocation(form, city, area);
  });
  return cleared;
};

describe('applyPodLocation', () => {
  it('ignores a pick that names no city', () => {
    const { result } = renderForm();

    expect(move(result.current, '', 'Hazratganj')).toBe(false);

    expect(result.current.getValues()).toMatchObject(podInGomtiNagar);
  });

  it('keeps the club, venue and slot when the same area is picked again', () => {
    const { result } = renderForm();

    expect(move(result.current, 'loc-lucknow', 'Gomti Nagar')).toBe(false);

    expect(result.current.getValues()).toMatchObject(podInGomtiNagar);
  });

  it('clears only the club when the area moves within the city', () => {
    const { result } = renderForm();

    expect(move(result.current, 'loc-lucknow', 'Hazratganj')).toBe(true);

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

    expect(move(result.current, 'loc-pune', 'Baner')).toBe(true);

    expect(result.current.getValues()).toMatchObject({
      location_id: 'loc-pune',
      locality: 'Baner',
      club_id: '',
      venue_id: '',
      venue_slot_id: '',
    });
  });
  it('reports nothing cleared when the area moves before a club was picked', () => {
    const { result } = renderForm({ location_id: 'loc-lucknow', locality: 'Gomti Nagar' });

    expect(move(result.current, 'loc-lucknow', 'Hazratganj')).toBe(false);
    expect(result.current.getValues('locality')).toBe('Hazratganj');
  });

  it('reports a cleared venue when the city changes with no club picked', () => {
    const { result } = renderForm({ location_id: 'loc-lucknow', venue_id: 'venue-gomti-arena' });

    expect(move(result.current, 'loc-pune', 'Baner')).toBe(true);
    expect(result.current.getValues('venue_id')).toBe('');
  });

  it('reports a cleared slot when the city changes with only a slot picked', () => {
    const { result } = renderForm({ location_id: 'loc-lucknow', venue_slot_id: 'slot-sat-6pm' });

    expect(move(result.current, 'loc-pune', 'Baner')).toBe(true);
    expect(result.current.getValues('venue_slot_id')).toBe('');
  });
});
