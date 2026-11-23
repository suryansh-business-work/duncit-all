import { useFormContext, useWatch } from 'react-hook-form';
import { usePodFormData } from '../context';
import { isFreePodType } from '../pod-type';
import type { PodFormValues } from '../types';
import type { VenueStanding } from './projectionRows';
import { useEarningsProjection, type EarningsProjectionState } from './useEarningsProjection';

/** Where the venue stands, from the form: an Auto Pod's venue is still to
 * enrol, a virtual pod has none, a physical pod may or may not have its slot. */
export function venueStanding(autoPod: boolean, podMode: string, slotId: string): VenueStanding {
  if (autoPod) return 'pending';
  if (podMode === 'VIRTUAL') return 'none';
  return slotId ? 'slot' : 'unpicked';
}

export interface FormEarnings extends EarningsProjectionState {
  podAmount: number;
  noOfSpots: number;
  venue: VenueStanding;
  isFree: boolean;
}

/**
 * The server projection for the pod on the form — one derivation for the panel
 * that draws it and the Save button it gates, so both ask the same question
 * (Apollo shares the one request). Nothing is asked for a free pod, or while
 * `enabled` is false: only admin roles may ask (`adminPotentialPodEarnings`).
 */
export function useFormEarnings(enabled: boolean): FormEarnings {
  const { config } = usePodFormData();
  const { control } = useFormContext<PodFormValues>();
  const podAmount = Number(useWatch({ control, name: 'pod_amount' })) || 0;
  const noOfSpots = Number(useWatch({ control, name: 'no_of_spots' })) || 0;
  const podMode = useWatch({ control, name: 'pod_mode' });
  const venueId = useWatch({ control, name: 'venue_id' });
  const slotId = useWatch({ control, name: 'venue_slot_id' });
  const hosts = useWatch({ control, name: 'pod_hosts_id' });
  const isFree = isFreePodType(useWatch({ control, name: 'pod_type' }));
  const venue = venueStanding(!!config.autoPod, podMode, slotId);
  const state = useEarningsProjection({
    podAmount,
    noOfSpots,
    hostUserId: hosts[0] ?? null,
    venueId: venue === 'slot' ? venueId : null,
    venueSlotId: venue === 'slot' ? slotId : null,
    skip: isFree || !enabled,
  });
  return { ...state, podAmount, noOfSpots, venue, isFree };
}
